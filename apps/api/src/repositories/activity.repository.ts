import type { ActivityLog, Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const activityRepository = {
  create(data: Prisma.ActivityLogCreateInput): Promise<ActivityLog> {
    return prisma.activityLog.create({ data })
  },

  async list(input: {
    where: Prisma.ActivityLogWhereInput
    skip: number
    take: number
    cursor?: string
    sortOrder: 'asc' | 'desc'
  }): Promise<{ items: ActivityLog[]; total: number }> {
    const [items, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: input.where,
        orderBy: { createdAt: input.sortOrder },
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1, take: input.take }
          : { skip: input.skip, take: input.take }),
      }),
      prisma.activityLog.count({ where: input.where }),
    ])
    return { items, total }
  },
}
