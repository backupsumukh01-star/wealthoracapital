import type { Prisma, Session } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const sessionRepository = {
  create(data: Prisma.SessionCreateInput): Promise<Session> {
    return prisma.session.create({ data })
  },

  findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } })
  },

  findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { refreshTokenHash } })
  },

  listActiveByUser(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    })
  },

  update(id: string, data: Prisma.SessionUpdateInput): Promise<Session> {
    return prisma.session.update({ where: { id }, data })
  },

  async revoke(id: string): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  },

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    })
    return result.count
  },

  async revokeFamily(familyId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return result.count
  },
}
