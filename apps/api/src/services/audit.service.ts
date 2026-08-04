import type { Prisma } from '@prisma/client'

import { auditRepository } from '../repositories/audit.repository.js'
import { parseUserAgent } from '../utils/user-agent.js'

export const auditService = {
  async record(input: {
    actorId: string | null
    targetUserId?: string | null
    action: string
    module: string
    oldValue?: unknown
    newValue?: unknown
    reason?: string | null
    ip?: string | null
    userAgent?: string | null
  }): Promise<void> {
    const data: Prisma.AuditLogCreateInput = {
      action: input.action,
      module: input.module,
      reason: input.reason ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent?.slice(0, 400) ?? null,
      ...(input.actorId ? { actor: { connect: { id: input.actorId } } } : {}),
      ...(input.targetUserId ? { targetUser: { connect: { id: input.targetUserId } } } : {}),
    }

    if (input.oldValue !== undefined) {
      data.oldValue = input.oldValue as Prisma.InputJsonValue
    }
    if (input.newValue !== undefined) {
      data.newValue = input.newValue as Prisma.InputJsonValue
    }

    await auditRepository.create(data)
  },

  async list(input: {
    q?: string
    module?: string
    action?: string
    actorId?: string
    targetUserId?: string
    from?: Date
    to?: Date
    page: number
    limit: number
    cursor?: string
    sortOrder: 'asc' | 'desc'
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(input.module ? { module: input.module } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.actorId ? { actorId: input.actorId } : {}),
      ...(input.targetUserId ? { targetUserId: input.targetUserId } : {}),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
      ...(input.q
        ? {
            OR: [
              { action: { contains: input.q, mode: 'insensitive' } },
              { module: { contains: input.q, mode: 'insensitive' } },
              { reason: { contains: input.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const skip = (input.page - 1) * input.limit
    const { items, total } = await auditRepository.list({
      where,
      skip,
      take: input.limit,
      cursor: input.cursor,
      sortOrder: input.sortOrder,
    })

    const mapped = items.map((row) => {
      const withActor = row as typeof row & {
        actor?: {
          id: string
          firstName: string
          lastName: string
          role: string
          email: string
        } | null
      }
      const ua = parseUserAgent(withActor.userAgent)
      return {
        id: withActor.id,
        actorName: withActor.actor
          ? `${withActor.actor.firstName} ${withActor.actor.lastName}`.trim()
          : null,
        actorRole: withActor.actor?.role ?? null,
        actorId: withActor.actorId,
        action: withActor.action,
        module: withActor.module,
        targetType: withActor.targetUserId ? 'user' : null,
        targetId: withActor.targetUserId,
        oldValue: withActor.oldValue,
        newValue: withActor.newValue,
        reason: withActor.reason,
        ip: withActor.ip,
        browser: ua.browser,
        createdAt: withActor.createdAt.toISOString(),
      }
    })

    return {
      items: mapped,
      nextCursor: mapped.length === input.limit ? mapped[mapped.length - 1]?.id ?? null : null,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        hasNext: skip + mapped.length < total,
      },
    }
  },
}
