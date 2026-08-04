import { randomBytes } from 'node:crypto'

import type { Prisma, SupportCategory, SupportTicketStatus, PriorityLevel } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { notFound, badRequest } from '../utils/errors.js'
import { activityService } from './activity.service.js'
import { auditService } from './audit.service.js'
import { notificationService } from './notification.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function reference(): string {
  return `TCK-${randomBytes(4).toString('hex').toUpperCase()}`
}

function userLabel(user: { firstName: string; lastName: string; email: string } | null | undefined): string {
  if (!user) return 'Unknown'
  const name = `${user.firstName} ${user.lastName}`.trim()
  return name.length > 0 ? name : user.email
}

const ticketInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
  messages: { orderBy: { createdAt: 'asc' as const } },
}

type TicketWithRelations = Prisma.SupportTicketGetPayload<{ include: typeof ticketInclude }>

function mapTicket(ticket: TicketWithRelations) {
  return {
    id: ticket.id,
    reference: ticket.reference,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    userLabel: userLabel(ticket.user),
    userId: ticket.userId,
    assigneeId: ticket.assigneeId,
    assigneeLabel: ticket.assignee ? userLabel(ticket.assignee) : null,
    internalNotes: ticket.internalNotes,
    mergedIntoId: ticket.mergedIntoId,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null,
    messages: ticket.messages
      .filter((m) => m.authorType !== 'INTERNAL_NOTE')
      .map((m) => ({
        id: m.id,
        author: m.authorType === 'USER' ? userLabel(ticket.user) : m.authorType === 'AGENT' ? 'Support' : 'System',
        authorType: m.authorType,
        body: m.body,
        attachments: m.attachments,
        at: m.createdAt.toISOString(),
      })),
  }
}

async function getTicketOrThrow(id: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: ticketInclude })
  if (!ticket) throw notFound('Support ticket not found.')
  return ticket
}

export const supportService = {
  async listMine(userId: string) {
    const rows = await prisma.supportTicket.findMany({
      where: { userId },
      include: ticketInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(mapTicket)
  },

  async get(id: string, userId?: string) {
    const ticket = await getTicketOrThrow(id)
    if (userId && ticket.userId !== userId) throw notFound('Support ticket not found.')
    return mapTicket(ticket)
  },

  async create(
    userId: string,
    body: { subject: string; body: string; category?: SupportCategory },
    context: Ctx,
  ) {
    const ticket = await prisma.supportTicket.create({
      data: {
        reference: reference(),
        userId,
        subject: body.subject,
        category: body.category ?? 'GENERAL',
        lastMessageAt: new Date(),
        messages: { create: { authorId: userId, authorType: 'USER', body: body.body } },
      },
      include: ticketInclude,
    })
    await activityService.record({
      userId,
      actorId: userId,
      kind: 'SUPPORT_TICKET_CREATED',
      title: `Support ticket ${ticket.reference} created`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTicket(ticket)
  },

  async reply(
    ticketId: string,
    authorId: string,
    body: { message: string },
    options: { isAgent: boolean; userId?: string },
    context: Ctx,
  ) {
    const existing = await getTicketOrThrow(ticketId)
    if (!options.isAgent && existing.userId !== options.userId) {
      throw notFound('Support ticket not found.')
    }
    await prisma.supportMessage.create({
      data: {
        ticketId,
        authorId,
        authorType: options.isAgent ? 'AGENT' : 'USER',
        body: body.message,
      },
    })
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        lastMessageAt: new Date(),
        status: options.isAgent && existing.status === 'OPEN' ? 'PENDING' : existing.status,
      },
      include: ticketInclude,
    })
    await activityService.record({
      userId: existing.userId,
      actorId: authorId,
      kind: 'SUPPORT_TICKET_REPLIED',
      title: `Support ticket ${existing.reference} replied`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    if (options.isAgent) {
      await notificationService.notify({
        userId: existing.userId,
        kind: 'SUPPORT',
        title: 'New reply on your support ticket',
        body: `Support replied to "${existing.subject}"`,
        type: 'SUPPORT_TICKET_REPLIED',
        actionUrl: `/support`,
      })
    }
    return mapTicket(updated)
  },

  async adminList(query: { status?: SupportTicketStatus; priority?: PriorityLevel; category?: SupportCategory; assigneeId?: string; q?: string }) {
    const rows = await prisma.supportTicket.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.q
          ? {
              OR: [
                { subject: { contains: query.q, mode: 'insensitive' } },
                { reference: { contains: query.q.toUpperCase() } },
                { user: { email: { contains: query.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: ticketInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(mapTicket)
  },

  async assign(id: string, actorId: string, assigneeId: string | null, context: Ctx) {
    await getTicketOrThrow(id)
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { assigneeId },
      include: ticketInclude,
    })
    await activityService.record({
      userId: updated.userId,
      actorId,
      kind: 'SUPPORT_TICKET_ASSIGNED',
      title: `Support ticket ${updated.reference} assigned`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTicket(updated)
  },

  async updatePriority(id: string, actorId: string, priority: PriorityLevel, context: Ctx) {
    await getTicketOrThrow(id)
    const updated = await prisma.supportTicket.update({ where: { id }, data: { priority }, include: ticketInclude })
    await auditService.record({
      actorId,
      action: 'support.priority_update',
      module: 'support',
      newValue: { id, priority },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTicket(updated)
  },

  async updateCategory(id: string, actorId: string, category: SupportCategory, context: Ctx) {
    await getTicketOrThrow(id)
    const updated = await prisma.supportTicket.update({ where: { id }, data: { category }, include: ticketInclude })
    await auditService.record({
      actorId,
      action: 'support.category_update',
      module: 'support',
      newValue: { id, category },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTicket(updated)
  },

  async addInternalNote(id: string, actorId: string, note: string, context: Ctx) {
    await getTicketOrThrow(id)
    await prisma.supportMessage.create({
      data: { ticketId: id, authorId: actorId, authorType: 'INTERNAL_NOTE', body: note },
    })
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { internalNotes: note },
      include: ticketInclude,
    })
    await auditService.record({
      actorId,
      action: 'support.internal_note',
      module: 'support',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTicket(updated)
  },

  async close(id: string, actorId: string, context: Ctx) {
    const existing = await getTicketOrThrow(id)
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: ticketInclude,
    })
    await activityService.record({
      userId: existing.userId,
      actorId,
      kind: 'SUPPORT_TICKET_CLOSED',
      title: `Support ticket ${existing.reference} closed`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await notificationService.notify({
      userId: existing.userId,
      kind: 'SUPPORT',
      title: 'Support ticket closed',
      body: `Your ticket "${existing.subject}" has been closed.`,
      type: 'SUPPORT_TICKET_CLOSED',
    })
    return mapTicket(updated)
  },

  async reopen(id: string, actorId: string, context: Ctx) {
    await getTicketOrThrow(id)
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status: 'OPEN', closedAt: null },
      include: ticketInclude,
    })
    await auditService.record({
      actorId,
      action: 'support.reopen',
      module: 'support',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTicket(updated)
  },

  async merge(sourceId: string, targetId: string, actorId: string, context: Ctx) {
    if (sourceId === targetId) throw badRequest('Cannot merge a ticket into itself.')
    await Promise.all([getTicketOrThrow(sourceId), getTicketOrThrow(targetId)])
    await prisma.supportMessage.updateMany({ where: { ticketId: sourceId }, data: { ticketId: targetId } })
    const updated = await prisma.supportTicket.update({
      where: { id: sourceId },
      data: { status: 'CLOSED', mergedIntoId: targetId, closedAt: new Date() },
      include: ticketInclude,
    })
    await auditService.record({
      actorId,
      action: 'support.merge',
      module: 'support',
      newValue: { sourceId, targetId },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { source: mapTicket(updated), target: mapTicket(await getTicketOrThrow(targetId)) }
  },

  async transfer(id: string, actorId: string, assigneeId: string, context: Ctx) {
    return this.assign(id, actorId, assigneeId, context)
  },

  async metrics() {
    const [open, pending, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'PENDING' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ])
    return { open, pending, resolved, closed, total: open + pending + resolved + closed }
  },
}
