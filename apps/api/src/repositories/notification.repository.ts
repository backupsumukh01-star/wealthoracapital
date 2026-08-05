import type { Notification, Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const notificationRepository = {
  create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data })
  },

  listForUser(userId: string, take = 50): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    })
  },

  unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    })
  },

  markRead(id: string, userId: string): Promise<Notification> {
    return prisma.notification
      .updateMany({
        where: { id, userId },
        data: { readAt: new Date() },
      })
      .then(async (result) => {
        if (result.count === 0) {
          throw new Error('Notification ownership mismatch')
        }
        const row = await prisma.notification.findUniqueOrThrow({ where: { id } })
        return row
      })
  },

  listPaged(userId: string, options: { cursor?: string; unreadOnly?: boolean; take?: number }): Promise<Notification[]> {
    const take = options.take ?? 30
    return prisma.notification.findMany({
      where: {
        userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
        ...(options.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    })
  },

  findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } })
  },

  markAllRead(userId: string): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  },

  async remove(id: string, userId: string): Promise<void> {
    const row = await prisma.notification.findUnique({ where: { id } })
    if (!row || row.userId !== userId) return
    await prisma.notification.delete({ where: { id } })
  },
}
