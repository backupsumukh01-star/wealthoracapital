import type { Prisma, TokenType, VerificationToken } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const verificationTokenRepository = {
  create(data: Prisma.VerificationTokenCreateInput): Promise<VerificationToken> {
    return prisma.verificationToken.create({ data })
  },

  findByHash(tokenHash: string): Promise<VerificationToken | null> {
    return prisma.verificationToken.findUnique({ where: { tokenHash } })
  },

  async invalidateActiveTokens(userId: string, type: TokenType): Promise<number> {
    const result = await prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    })
    return result.count
  },

  markUsed(id: string): Promise<VerificationToken> {
    return prisma.verificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  },
}
