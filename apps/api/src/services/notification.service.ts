import type { NotificationKind, Prisma } from '@prisma/client'

import { notificationRepository } from '../repositories/notification.repository.js'

/**
 * Database-only notification architecture.
 * No email, push, or websocket delivery in Phase 2.
 */
export const notificationService = {
  async notify(input: {
    userId: string
    kind?: NotificationKind
    title: string
    body: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await notificationRepository.create({
      user: { connect: { id: input.userId } },
      kind: input.kind ?? 'SYSTEM',
      title: input.title,
      body: input.body,
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
    })
  },

  listMine(userId: string) {
    return notificationRepository.listForUser(userId)
  },

  unreadCount(userId: string) {
    return notificationRepository.unreadCount(userId)
  },
}
