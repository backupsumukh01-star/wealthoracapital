import type { AuditLog, Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const auditRepository = {
  create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return prisma.auditLog.create({ data })
  },

  async list(input: {
    where: Prisma.AuditLogWhereInput
    skip: number
    take: number
    cursor?: string
    sortOrder: 'asc' | 'desc'
  }): Promise<{ items: AuditLog[]; total: number }> {
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: input.where,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
        },
        orderBy: { createdAt: input.sortOrder },
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1, take: input.take }
          : { skip: input.skip, take: input.take }),
      }),
      prisma.auditLog.count({ where: input.where }),
    ])
    return { items, total }
  },
}
