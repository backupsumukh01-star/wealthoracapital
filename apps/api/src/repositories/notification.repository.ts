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
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    }).then(async (row) => {
      if (row.userId !== userId) {
        throw new Error('Notification ownership mismatch')
      }
      return row
    })
  },
}
