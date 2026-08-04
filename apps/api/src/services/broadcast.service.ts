import { Prisma } from '@prisma/client'
import type { Broadcast, BroadcastAudience, BroadcastChannel, BroadcastStatus } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { notFound, badRequest } from '../utils/errors.js'
import { activityService } from './activity.service.js'
import { cmsService } from './cms/cms.service.js'
import { notificationService } from './notification.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function mapBroadcast(row: Broadcast) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    channels: row.channels as BroadcastChannel[],
    audience: row.audience,
    audienceFilter: row.audienceFilter,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    stats: row.stats,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function resolveAudienceUserIds(
  audience: BroadcastAudience,
  filter: Record<string, unknown> | null | undefined,
): Promise<string[]> {
  const baseWhere: Prisma.UserWhereInput = { role: 'USER' }
  switch (audience) {
    case 'ALL':
      break
    case 'COUNTRY':
      if (typeof filter?.country === 'string') baseWhere.country = filter.country
      break
    case 'VIP':
      // Placeholder segment — VIP tiering isn't modeled yet; falls back to all investors.
      break
    case 'SELECTED':
      if (Array.isArray(filter?.userIds)) {
        return (filter.userIds as unknown[]).filter((v): v is string => typeof v === 'string')
      }
      return []
    case 'SINGLE':
      if (typeof filter?.userId === 'string') return [filter.userId]
      return []
    case 'SEGMENT':
      break
  }
  const users = await prisma.user.findMany({ where: baseWhere, select: { id: true }, take: 50000 })
  return users.map((u) => u.id)
}

export const broadcastService = {
  async list(query: { status?: BroadcastStatus }) {
    const rows = await prisma.broadcast.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(mapBroadcast)
  },

  async get(id: string) {
    const row = await prisma.broadcast.findUnique({ where: { id } })
    if (!row) throw notFound('Broadcast not found.')
    return mapBroadcast(row)
  },

  async create(
    actorId: string,
    body: {
      title: string
      body: string
      channels: BroadcastChannel[]
      audience: BroadcastAudience
      audienceFilter?: Record<string, unknown>
      scheduledAt?: string | null
    },
  ) {
    const row = await prisma.broadcast.create({
      data: {
        title: body.title,
        body: body.body,
        channels: body.channels as unknown as Prisma.InputJsonValue,
        audience: body.audience,
        audienceFilter: (body.audienceFilter ?? undefined) as Prisma.InputJsonValue | undefined,
        status: body.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        createdById: actorId,
      },
    })
    return mapBroadcast(row)
  },

  async update(
    id: string,
    body: Partial<{
      title: string
      body: string
      channels: BroadcastChannel[]
      audience: BroadcastAudience
      audienceFilter: Record<string, unknown> | null
      scheduledAt: string | null
    }>,
  ) {
    const existing = await prisma.broadcast.findUnique({ where: { id } })
    if (!existing) throw notFound('Broadcast not found.')
    if (existing.status === 'SENT') throw badRequest('Cannot edit a broadcast that has already been sent.')
    const row = await prisma.broadcast.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
        ...(body.channels !== undefined ? { channels: body.channels as unknown as Prisma.InputJsonValue } : {}),
        ...(body.audience !== undefined ? { audience: body.audience } : {}),
        ...(body.audienceFilter !== undefined
          ? { audienceFilter: (body.audienceFilter ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {}),
        ...(body.scheduledAt !== undefined
          ? {
              scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
              status: body.scheduledAt ? 'SCHEDULED' : 'DRAFT',
            }
          : {}),
      },
    })
    return mapBroadcast(row)
  },

  async cancel(id: string) {
    const existing = await prisma.broadcast.findUnique({ where: { id } })
    if (!existing) throw notFound('Broadcast not found.')
    if (existing.status === 'SENT') throw badRequest('Cannot cancel a broadcast that has already been sent.')
    return mapBroadcast(await prisma.broadcast.update({ where: { id }, data: { status: 'CANCELLED' } }))
  },

  async send(id: string, actorId: string, context: Ctx) {
    const existing = await prisma.broadcast.findUnique({ where: { id } })
    if (!existing) throw notFound('Broadcast not found.')
    if (existing.status === 'SENT') throw badRequest('Broadcast already sent.')

    const channels = existing.channels as BroadcastChannel[]
    const userIds = await resolveAudienceUserIds(existing.audience, existing.audienceFilter as Record<string, unknown> | null)

    if (channels.includes('ANNOUNCEMENT')) {
      await cmsService.createAnnouncement(actorId, {
        type: 'NEWS',
        title: existing.title,
        body: existing.body,
        popup: channels.includes('POPUP'),
        status: 'PUBLISHED',
      })
    }

    if (channels.includes('IN_APP') || channels.includes('EMAIL')) {
      const users = channels.includes('EMAIL')
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
        : userIds.map((id) => ({ id, email: null as string | null }))

      for (const user of users) {
        await notificationService.notify({
          userId: user.id,
          kind: 'BROADCAST',
          title: existing.title,
          body: existing.body,
          type: 'BROADCAST',
          channels: [
            ...(channels.includes('IN_APP') ? (['DATABASE'] as const) : []),
            ...(channels.includes('EMAIL') && user.email ? (['EMAIL'] as const) : []),
          ],
          ...(channels.includes('EMAIL') && user.email ? { email: { to: user.email, subject: existing.title } } : {}),
        })
      }
    }

    const row = await prisma.broadcast.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        stats: { recipientCount: userIds.length } as Prisma.InputJsonValue,
      },
    })

    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'BROADCAST_SENT',
      title: `Broadcast sent: ${existing.title}`,
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapBroadcast(row)
  },

  /** Invoked by the job queue for broadcasts whose `scheduledAt` has passed. */
  async processScheduled(): Promise<number> {
    const due = await prisma.broadcast.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    })
    for (const broadcast of due) {
      await this.send(broadcast.id, broadcast.createdById ?? 'system', {})
    }
    return due.length
  },
}
