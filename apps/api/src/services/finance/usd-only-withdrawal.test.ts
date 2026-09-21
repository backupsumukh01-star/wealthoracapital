/**
 * USD-only withdrawal mode: historical deposit rail must not block crypto payouts.
 * DB-backed cases skip when DATABASE_URL is unset / Postgres is unavailable.
 */
import { createHash, randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll } from 'vitest'

import type * as prismaModule from '../../database/prisma.js'
import type * as ledgerModule from './ledger.service.js'
import type * as withdrawalModule from './withdrawal.service.js'
import type * as emailOtpModule from '../email-otp.service.js'
import { AppError } from '../../utils/errors.js'
import { d } from '../../utils/money.js'

const hasDbUrl = Boolean(process.env.DATABASE_URL)

async function postgresReachable(): Promise<boolean> {
  if (!hasDbUrl) return false
  try {
    const { prisma } = await import('../../database/prisma.js')
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

const dbReady = await postgresReachable()

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

describe.skipIf(!dbReady)('USD-only withdrawal (service)', () => {
  let prisma: typeof prismaModule.prisma
  let ledgerService: typeof ledgerModule.ledgerService
  let withdrawalService: typeof withdrawalModule.withdrawalService
  let emailOtpService: typeof emailOtpModule.emailOtpService

  beforeAll(async () => {
    ;({ prisma } = await import('../../database/prisma.js'))
    ;({ ledgerService } = await import('./ledger.service.js'))
    ;({ withdrawalService } = await import('./withdrawal.service.js'))
    ;({ emailOtpService } = await import('../email-otp.service.js'))
  })

  async function plantWithdrawalOtp(
    userId: string,
    amount: string,
    payoutMethodId: string,
    otp = '424242',
  ) {
    await emailOtpService.invalidatePrior(userId, 'WITHDRAWAL_OTP')
    await prisma.verificationToken.create({
      data: {
        userId,
        tokenHash: hashOtp(`WDR:${userId}:${otp}:${Date.now()}`),
        type: 'EMAIL_CHANGE',
        expiresAt: new Date(Date.now() + 600_000),
        payload: {
          otpKind: 'WITHDRAWAL_OTP',
          attempts: 0,
          otpHash: hashOtp(otp),
          amount,
          payoutMethodId,
        },
      },
    })
    return otp
  }

  async function seedInvestor() {
    const email = `usd_wd_${randomUUID().slice(0, 10)}@example.com`
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'test',
        firstName: 'Usd',
        lastName: 'Withdraw',
        status: 'ACTIVE',
        role: 'USER',
        kycStatus: 'APPROVED',
        emailVerifiedAt: new Date(),
        timezone: 'UTC',
      },
    })
    const wallets = await ledgerService.ensureWalletsForUser(user.id)
    const investment = wallets.find((w) => w.kind === 'INVESTMENT')!
    return { user, investment }
  }

  async function creditAvailable(userId: string, walletId: string, amount: string) {
    await prisma.$transaction(async (tx) => {
      await ledgerService.creditAvailable(tx, {
        userId,
        walletId,
        amount: d(amount),
        entryType: 'ADJUSTMENT_CREDIT',
        transactionType: 'ADMIN_ADJUSTMENT',
        description: 'usd-only withdrawal seed',
        referenceType: 'ADMIN_ADJUSTMENT',
        referenceId: userId,
        createdById: userId,
        idempotencyKey: `usd-wd-seed-${randomUUID()}`,
        bumpInvested: true,
        bumpDeposited: true,
      })
    })
  }

  async function ensurePaymentMethod(type: 'BANK_TRANSFER' | 'CRYPTO' | 'UPI') {
    const existing = await prisma.paymentMethod.findFirst({
      where: { type, isActive: true, deletedAt: null },
    })
    if (existing) return existing
    return prisma.paymentMethod.create({
      data: {
        name: `QA ${type}`,
        type,
        instructions: 'QA',
        minAmount: '1',
        maxAmount: '100000',
        feePct: '0',
        isActive: true,
        priority: type === 'CRYPTO' ? 50 : 1,
      },
    })
  }

  async function plantApprovedDeposit(
    userId: string,
    walletId: string,
    methodId: string,
    amount: string,
  ) {
    return prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId,
        walletId,
        paymentMethodId: methodId,
        amount,
        fee: '0',
        creditedAmount: amount,
        currency: 'USD',
        status: 'APPROVED',
        reviewedAt: new Date(),
        lockDays: 10,
        fundsUnlockAt: new Date(Date.now() - 24 * 3600_000),
        amountInr: '0',
        idempotencyKey: `usd-wd-dep-${randomUUID()}`,
      },
    })
  }

  async function createCryptoPayout(userId: string) {
    return prisma.payoutMethod.create({
      data: {
        userId,
        label: 'QA USDT',
        type: 'USDT_TRC20',
        details: { address: 'TQAUSDONLY' },
        maskedDetails: 'TQA••••',
        isDefault: true,
        isVerified: true,
      },
    })
  }

  async function ledgerCount(walletId: string) {
    return prisma.ledgerEntry.count({ where: { walletId } })
  }

  it('historical INR/bank/UPI deposit + USD crypto withdrawal is allowed', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const bank = await ensurePaymentMethod('BANK_TRANSFER')
    await plantApprovedDeposit(user.id, investment.id, bank.id, '50')
    const payout = await createCryptoPayout(user.id)
    const otp = await plantWithdrawalOtp(user.id, '40.00', payout.id)

    const wd = await withdrawalService.create(
      user.id,
      {
        amount: '40.00',
        payoutMethodId: payout.id,
        otp,
        idempotencyKey: `usd-wd-inr-${randomUUID()}`,
      },
      {},
    )

    expect(wd.status).toBe('PENDING')
    expect(wd.amount).toBe('40.00')
  })

  it('historical crypto deposit + USD crypto withdrawal is allowed', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const crypto = await ensurePaymentMethod('CRYPTO')
    await plantApprovedDeposit(user.id, investment.id, crypto.id, '50')
    const payout = await createCryptoPayout(user.id)
    const otp = await plantWithdrawalOtp(user.id, '40.00', payout.id)

    const wd = await withdrawalService.create(
      user.id,
      {
        amount: '40.00',
        payoutMethodId: payout.id,
        otp,
        idempotencyKey: `usd-wd-crypto-${randomUUID()}`,
      },
      {},
    )

    expect(wd.status).toBe('PENDING')
  })

  it('rejects insufficient available balance', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '25')
    const bank = await ensurePaymentMethod('BANK_TRANSFER')
    await plantApprovedDeposit(user.id, investment.id, bank.id, '10')
    const payout = await createCryptoPayout(user.id)
    const otp = await plantWithdrawalOtp(user.id, '40.00', payout.id)
    const before = await ledgerCount(investment.id)

    await expect(
      withdrawalService.create(
        user.id,
        {
          amount: '40.00',
          payoutMethodId: payout.id,
          otp,
          idempotencyKey: `usd-wd-bal-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toMatchObject({ message: expect.stringMatching(/available|holding|exceeds/i) })

    expect(await ledgerCount(investment.id)).toBe(before)
    expect(await prisma.withdrawal.count({ where: { userId: user.id } })).toBe(0)
  })

  it('rejects inactive or foreign payout method', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const payout = await createCryptoPayout(user.id)
    await prisma.payoutMethod.update({
      where: { id: payout.id },
      data: { deletedAt: new Date() },
    })
    const otp = await plantWithdrawalOtp(user.id, '40.00', payout.id)
    const before = await ledgerCount(investment.id)

    await expect(
      withdrawalService.create(
        user.id,
        {
          amount: '40.00',
          payoutMethodId: payout.id,
          otp,
          idempotencyKey: `usd-wd-payout-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toMatchObject({ message: 'Payout method not found.' })

    const other = await seedInvestor()
    const foreign = await createCryptoPayout(other.user.id)
    await expect(
      withdrawalService.create(
        user.id,
        {
          amount: '40.00',
          payoutMethodId: foreign.id,
          otp: '424242',
          idempotencyKey: `usd-wd-foreign-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toMatchObject({ message: 'Payout method not found.' })

    expect(await ledgerCount(investment.id)).toBe(before)
  })

  it('rejects inactive / unknown user', async () => {
    await expect(
      withdrawalService.create(
        randomUUID(),
        {
          amount: '40.00',
          payoutMethodId: randomUUID(),
          otp: '424242',
          idempotencyKey: `usd-wd-nouser-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toMatchObject({ message: 'User not found.' })

    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const payout = await createCryptoPayout(user.id)
    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } })
    const otp = await plantWithdrawalOtp(user.id, '40.00', payout.id)

    await expect(
      withdrawalService.create(
        user.id,
        {
          amount: '40.00',
          payoutMethodId: payout.id,
          otp,
          idempotencyKey: `usd-wd-inactive-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('rejects missing or invalid withdrawal OTP without creating a withdrawal', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const payout = await createCryptoPayout(user.id)
    const before = await ledgerCount(investment.id)

    await expect(
      withdrawalService.create(
        user.id,
        {
          amount: '40.00',
          payoutMethodId: payout.id,
          otp: '000000',
          idempotencyKey: `usd-wd-otp-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toMatchObject({ message: expect.stringMatching(/code|otp/i) })

    expect(await prisma.withdrawal.count({ where: { userId: user.id } })).toBe(0)
    expect(await ledgerCount(investment.id)).toBe(before)
  })

  it('returns the existing withdrawal for a duplicate idempotency key', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const payout = await createCryptoPayout(user.id)
    const otp = await plantWithdrawalOtp(user.id, '40.00', payout.id)
    const key = `usd-wd-idem-${randomUUID()}`

    const first = await withdrawalService.create(
      user.id,
      { amount: '40.00', payoutMethodId: payout.id, otp, idempotencyKey: key },
      {},
    )
    const second = await withdrawalService.create(
      user.id,
      { amount: '40.00', payoutMethodId: payout.id, otp: '999999', idempotencyKey: key },
      {},
    )

    expect(second.id).toBe(first.id)
    expect(await prisma.withdrawal.count({ where: { userId: user.id } })).toBe(1)
  })

  it('does not mutate the ledger when OTP verification fails', async () => {
    const { user, investment } = await seedInvestor()
    await creditAvailable(user.id, investment.id, '200')
    const bank = await ensurePaymentMethod('UPI')
    await plantApprovedDeposit(user.id, investment.id, bank.id, '50')
    const payout = await createCryptoPayout(user.id)
    await plantWithdrawalOtp(user.id, '40.00', payout.id)
    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    const ledgerBefore = await ledgerCount(investment.id)

    await expect(
      withdrawalService.create(
        user.id,
        {
          amount: '40.00',
          payoutMethodId: payout.id,
          otp: '111111',
          idempotencyKey: `usd-wd-nolegder-${randomUUID()}`,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(AppError)

    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(String(walletAfter.availableBalance)).toBe(String(walletBefore.availableBalance))
    expect(String(walletAfter.lockedBalance)).toBe(String(walletBefore.lockedBalance))
    expect(await ledgerCount(investment.id)).toBe(ledgerBefore)
    expect(await prisma.withdrawal.count({ where: { userId: user.id } })).toBe(0)
  })
})
