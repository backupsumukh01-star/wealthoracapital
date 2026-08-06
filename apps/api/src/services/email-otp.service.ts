import { createHash, randomInt } from 'node:crypto'

import { prisma } from '../database/prisma.js'
import { emailService } from '../emails/email.service.js'
import { badRequest, tooManyRequests } from '../utils/errors.js'

const LOGIN_OTP_TTL_MS = 10 * 60_000
const WITHDRAWAL_OTP_TTL_MS = 10 * 60_000
const MAX_ATTEMPTS = 5

type OtpKind = 'LOGIN_OTP' | 'WITHDRAWAL_OTP'

type OtpPayload = {
  otpKind: OtpKind
  attempts: number
  otpHash: string
  withdrawalId?: string | null
  /** Bound withdrawal intent — required for WITHDRAWAL_OTP. */
  amount?: string | null
  payoutMethodId?: string | null
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

function generateSixDigit(): string {
  return String(randomInt(100000, 999999))
}

function readPayload(raw: unknown): OtpPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = raw as Record<string, unknown>
  if (p.otpKind !== 'LOGIN_OTP' && p.otpKind !== 'WITHDRAWAL_OTP') return null
  if (typeof p.otpHash !== 'string') return null
  return {
    otpKind: p.otpKind,
    attempts: Number(p.attempts ?? 0),
    otpHash: p.otpHash,
    withdrawalId: typeof p.withdrawalId === 'string' ? p.withdrawalId : null,
    amount: typeof p.amount === 'string' ? p.amount : null,
    payoutMethodId: typeof p.payoutMethodId === 'string' ? p.payoutMethodId : null,
  }
}

/**
 * Email OTP helpers for login / withdrawal confirmation.
 * Stores OTPs in VerificationToken with type EMAIL_CHANGE + payload.otpKind
 * (avoids a schema migration while keeping auth money flows unchanged).
 */
export const emailOtpService = {
  maxAttempts: MAX_ATTEMPTS,
  loginTtlMs: LOGIN_OTP_TTL_MS,
  withdrawalTtlMs: WITHDRAWAL_OTP_TTL_MS,

  async issueLoginOtp(input: {
    userId: string
    email: string
    firstName: string
    ip?: string | null
    browser?: string | null
    os?: string | null
    country?: string | null
    device?: string | null
  }) {
    await this.invalidatePrior(input.userId, 'LOGIN_OTP')
    const otp = generateSixDigit()
    await prisma.verificationToken.create({
      data: {
        userId: input.userId,
        tokenHash: hashOtp(`LOGIN:${input.userId}:${otp}:${Date.now()}`),
        type: 'EMAIL_CHANGE',
        expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_MS),
        payload: {
          otpKind: 'LOGIN_OTP',
          attempts: 0,
          otpHash: hashOtp(otp),
        },
      },
    })
    await emailService.sendLoginOtp({
      to: input.email,
      firstName: input.firstName,
      otp,
      ip: input.ip ?? undefined,
      browser: input.browser ?? undefined,
      os: input.os ?? undefined,
      country: input.country ?? undefined,
      device: input.device ?? undefined,
    })
    return { expiresInSeconds: Math.floor(LOGIN_OTP_TTL_MS / 1000) }
  },

  async verifyLoginOtp(userId: string, otp: string) {
    return this.verify(userId, 'LOGIN_OTP', otp)
  },

  async issueWithdrawalOtp(input: {
    userId: string
    email: string
    firstName: string
    amount: string
    payoutMethodId: string
    wallet?: string
    network?: string
    withdrawalId?: string
  }) {
    await this.invalidatePrior(input.userId, 'WITHDRAWAL_OTP')
    const otp = generateSixDigit()
    await prisma.verificationToken.create({
      data: {
        userId: input.userId,
        tokenHash: hashOtp(`WDR:${input.userId}:${otp}:${Date.now()}`),
        type: 'EMAIL_CHANGE',
        expiresAt: new Date(Date.now() + WITHDRAWAL_OTP_TTL_MS),
        payload: {
          otpKind: 'WITHDRAWAL_OTP',
          attempts: 0,
          otpHash: hashOtp(otp),
          withdrawalId: input.withdrawalId ?? null,
          amount: input.amount,
          payoutMethodId: input.payoutMethodId,
        },
      },
    })
    await emailService.sendWithdrawalOtp({
      to: input.email,
      firstName: input.firstName,
      otp,
      amount: input.amount,
      wallet: input.wallet,
      network: input.network,
      withdrawalId: input.withdrawalId,
    })
    return { expiresInSeconds: Math.floor(WITHDRAWAL_OTP_TTL_MS / 1000) }
  },

  async verifyWithdrawalOtp(
    userId: string,
    otp: string,
    intent: { amount: string; payoutMethodId: string },
  ) {
    return this.verify(userId, 'WITHDRAWAL_OTP', otp, intent)
  },

  async invalidatePrior(userId: string, kind: OtpKind) {
    const rows = await prisma.verificationToken.findMany({
      where: { userId, type: 'EMAIL_CHANGE', usedAt: null },
    })
    const ids = rows.filter((r) => readPayload(r.payload)?.otpKind === kind).map((r) => r.id)
    if (ids.length) {
      await prisma.verificationToken.updateMany({
        where: { id: { in: ids } },
        data: { usedAt: new Date() },
      })
    }
  },

  async verify(
    userId: string,
    kind: OtpKind,
    otp: string,
    intent?: { amount: string; payoutMethodId: string },
  ) {
    const rows = await prisma.verificationToken.findMany({
      where: {
        userId,
        type: 'EMAIL_CHANGE',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    const row = rows.find((r) => readPayload(r.payload)?.otpKind === kind)
    if (!row) {
      throw badRequest(
        `${kind === 'LOGIN_OTP' ? 'Login' : 'Withdrawal'} code expired or not found. Request a new code.`,
      )
    }

    const payload = readPayload(row.payload)
    if (!payload) throw badRequest('Invalid OTP record.')

    if (payload.attempts >= MAX_ATTEMPTS) {
      await prisma.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })
      throw tooManyRequests('Too many invalid OTP attempts. Request a new code.')
    }

    const ok = payload.otpHash === hashOtp(otp.trim())
    if (!ok) {
      await prisma.verificationToken.update({
        where: { id: row.id },
        data: {
          payload: { ...payload, attempts: payload.attempts + 1 },
        },
      })
      throw badRequest(`Invalid code. ${MAX_ATTEMPTS - payload.attempts - 1} attempts remaining.`)
    }

    if (kind === 'WITHDRAWAL_OTP') {
      if (!intent?.amount || !intent?.payoutMethodId) {
        throw badRequest('Withdrawal OTP requires amount and payout method.')
      }
      // Bind OTP to the exact request issued to the user (prevents OTP reuse for a different payout).
      if (!payload.amount || !payload.payoutMethodId) {
        throw badRequest('Withdrawal code is outdated. Request a new code.')
      }
      if (payload.amount !== intent.amount || payload.payoutMethodId !== intent.payoutMethodId) {
        throw badRequest(
          'Withdrawal details changed after the code was sent. Request a new code for this amount and wallet.',
        )
      }
    }

    await prisma.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })
    return true
  },
}
