import { prisma } from '../database/prisma.js'
import { userRepository } from '../repositories/user.repository.js'
import { badRequest } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export type RegistrationCodeResolution =
  | { kind: 'none' }
  | { kind: 'investor'; referrerId: string }
  | { kind: 'salesman'; salesmanId: string }

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

function normalizeCode(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const code = raw.trim().toUpperCase()
  return code.length > 0 ? code : undefined
}

/**
 * Isolated Sales Portal attribution. Never writes referredById or ReferralReward.
 * Investor referral codes always win when they match a User.referralCode.
 */
export const salesAttributionService = {
  async resolveRegistrationCode(raw: string | undefined): Promise<RegistrationCodeResolution> {
    const code = normalizeCode(raw)
    if (!code) return { kind: 'none' }

    const referrer = await userRepository.findByReferralCode(code)
    if (referrer) {
      return { kind: 'investor', referrerId: referrer.id }
    }

    const salesman = await prisma.salesman.findFirst({
      where: {
        status: 'ACTIVE',
        code: { equals: code, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (salesman) {
      return { kind: 'salesman', salesmanId: salesman.id }
    }

    throw badRequest('Invalid referral code.')
  },

  /**
   * First-touch lock. Unique userId is authoritative. Never overwrites.
   * Failures after user creation must not roll back the investor row.
   */
  async attributeNewInvestor(userId: string, salesmanId: string): Promise<void> {
    try {
      await prisma.salesAttribution.create({
        data: {
          userId,
          salesmanId,
          source: 'SALESMAN_LINK',
        },
      })
    } catch (err) {
      if (isUniqueViolation(err)) {
        return
      }
      logger.error({ err, userId }, 'Sales attribution insert failed after user create')
    }
  },
}
