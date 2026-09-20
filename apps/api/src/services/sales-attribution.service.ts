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
 *
 * Active salesman codes win when they match. That keeps /register?ref=S1 on the
 * salesman network and prevents a colliding User.referralCode from attaching
 * referredById (investor commission) to a salesman invite.
 * Investor referral codes still apply when no ACTIVE salesman owns the code.
 */
export const salesAttributionService = {
  async resolveRegistrationCode(raw: string | undefined): Promise<RegistrationCodeResolution> {
    const code = normalizeCode(raw)
    if (!code) return { kind: 'none' }

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

    const referrer = await userRepository.findByReferralCode(code)
    if (referrer) {
      return { kind: 'investor', referrerId: referrer.id }
    }

    throw badRequest('Invalid referral code.')
  },

  /**
   * First-touch lock. Unique userId is authoritative. Never overwrites.
   * Failures after user creation must not roll back the investor row.
   */
  async attributeNewInvestor(userId: string, salesmanId: string): Promise<void> {
    const existing = await prisma.salesAttribution.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (existing) return

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
