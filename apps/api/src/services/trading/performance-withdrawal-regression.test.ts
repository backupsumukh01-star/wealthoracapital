/**
 * Regression: pending/completed withdrawals must not wipe historical performance metrics.
 */
import { createHash, randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll } from 'vitest'

import { d } from '../../utils/money.js'

const hasDb = Boolean(process.env.DATABASE_URL)

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

describe.skipIf(!hasDb)('performance vs withdrawal regression', () => {
  let prisma: typeof import('../../database/prisma.js').prisma
  let ledgerService: typeof import('../finance/ledger.service.js').ledgerService
  let withdrawalService: typeof import('../finance/withdrawal.service.js').withdrawalService
  let performanceService: typeof import('./performance.service.js').performanceService
  let distributionService: typeof import('./distribution.service.js').distributionService
  let emailOtpService: typeof import('../email-otp.service.js').emailOtpService

  beforeAll(async () => {
    ;({ prisma } = await import('../../database/prisma.js'))
    ;({ ledgerService } = await import('../finance/ledger.service.js'))
    ;({ withdrawalService } = await import('../finance/withdrawal.service.js'))
    ;({ performanceService } = await import('./performance.service.js'))
    ;({ distributionService } = await import('./distribution.service.js'))
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

  async function seedInvestorWithHistory() {
    const email = `perf_wd_${randomUUID().slice(0, 10)}@example.com`
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'test',
        firstName: 'Perf',
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

    await prisma.$transaction(async (tx) => {
      await ledgerService.creditAvailable(tx, {
        userId: user.id,
        walletId: investment.id,
        amount: d('10000'),
        entryType: 'ADJUSTMENT_CREDIT',
        transactionType: 'ADMIN_ADJUSTMENT',
        description: 'seed deposit',
        referenceType: 'ADMIN_ADJUSTMENT',
        referenceId: user.id,
        createdById: user.id,
        idempotencyKey: `seed-dep-${randomUUID()}`,
        bumpInvested: true,
        bumpDeposited: true,
      })
    })

    const admin = await prisma.user.create({
      data: {
        email: `perf_admin_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'test',
        firstName: 'Admin',
        lastName: 'Perf',
        status: 'ACTIVE',
        role: 'ADMIN',
        staffRole: 'SUPER_ADMIN',
        kycStatus: 'APPROVED',
        emailVerifiedAt: new Date(),
        timezone: 'UTC',
      },
    })

    // Publish a few historical daily returns (unique past dates).
    for (const [i, pct] of ['1.50', '3.70', '-1.10', '0.80', '2.20'].entries()) {
      const date = new Date()
      date.setUTCHours(0, 0, 0, 0)
      date.setUTCDate(date.getUTCDate() - (i + 2))
      await distributionService.publishReturn(
        admin.id,
        {
          date: date.toISOString().slice(0, 10),
          returnPct: pct,
          idempotencyKey: `perf-run-${user.id}-${i}-${randomUUID()}`,
          returnBasis: 'INVESTED',
        },
        {},
      )
    }

    const payout = await prisma.payoutMethod.create({
      data: {
        userId: user.id,
        label: 'QA USDT',
        type: 'USDT_TRC20',
        details: { address: 'TPERFQA' },
        maskedDetails: 'TPERF••••',
        isDefault: true,
        isVerified: true,
      },
    })

    return { user, investment, payout }
  }

  it('pending withdrawal must not change historical performance summary', async () => {
    const { user, investment, payout } = await seedInvestorWithHistory()

    const before = await performanceService.summary(user.id)
    const monthlyBefore = await performanceService.monthly(user.id)
    const chartsBefore = await performanceService.investorAnalyticsCharts(user.id, '90d')
    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })

    expect(Number(before.roiPct)).toBeGreaterThan(0)
    expect(before.bestDay).not.toBeNull()
    expect(before.worstDay).not.toBeNull()
    expect(Number(before.bestDay?.returnPct ?? 0)).toBeGreaterThan(0)
    expect(Number(before.worstDay?.returnPct ?? 0)).not.toBe(0)

    // Withdraw nearly all available — leaves available near 0 while pending/locked.
    const withdrawAmount = d(walletBefore.availableBalance).minus(1).toFixed(2)
    const otp = await plantWithdrawalOtp(user.id, withdrawAmount, payout.id)
    await withdrawalService.create(
      user.id,
      {
        amount: withdrawAmount,
        payoutMethodId: payout.id,
        otp,
        idempotencyKey: `wd-perf-${randomUUID()}`,
      },
      {},
    )

    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(walletAfter.availableBalance).lt(d(walletBefore.availableBalance))).toBe(true)
    expect(d(walletAfter.lockedBalance).gt(0)).toBe(true)

    const after = await performanceService.summary(user.id)
    const monthlyAfter = await performanceService.monthly(user.id)
    const chartsAfter = await performanceService.investorAnalyticsCharts(user.id, '90d')

    expect(after.roiPct).toBe(before.roiPct)
    expect(after.thisMonthReturnPct).toBe(before.thisMonthReturnPct)
    expect(after.lastMonthReturnPct).toBe(before.lastMonthReturnPct)
    expect(after.winRatePct).toBe(before.winRatePct)
    expect(after.bestDay?.date).toBe(before.bestDay?.date)
    expect(after.bestDay?.returnPct).toBe(before.bestDay?.returnPct)
    expect(after.bestDay?.profit).toBe(before.bestDay?.profit)
    expect(after.worstDay?.date).toBe(before.worstDay?.date)
    expect(after.worstDay?.returnPct).toBe(before.worstDay?.returnPct)
    expect(after.worstDay?.profit).toBe(before.worstDay?.profit)
    expect(monthlyAfter.map((m) => ({ month: m.month, returnPct: m.returnPct }))).toEqual(
      monthlyBefore.map((m) => ({ month: m.month, returnPct: m.returnPct })),
    )
    expect(chartsAfter.dailyProfit.map((p) => p.returnPct)).toEqual(
      chartsBefore.dailyProfit.map((p) => p.returnPct),
    )
  })

  it('availableBalance=0 (full pending lock) still keeps historical return percentages', async () => {
    const { user, investment, payout } = await seedInvestorWithHistory()
    const before = await performanceService.summary(user.id)
    expect(Number(before.roiPct)).toBeGreaterThan(0)

    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    const withdrawAmount = d(walletBefore.availableBalance).toFixed(2)
    const otp = await plantWithdrawalOtp(user.id, withdrawAmount, payout.id)
    await withdrawalService.create(
      user.id,
      {
        amount: withdrawAmount,
        payoutMethodId: payout.id,
        otp,
        idempotencyKey: `wd-perf-full-${randomUUID()}`,
      },
      {},
    )

    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(walletAfter.availableBalance).eq(0)).toBe(true)
    // investedAmount must remain (lock only moves available → locked)
    expect(d(walletAfter.investedAmount).eq(d(walletBefore.investedAmount))).toBe(true)

    const after = await performanceService.summary(user.id)
    expect(Number(after.roiPct)).toBeGreaterThan(0)
    expect(after.roiPct).toBe(before.roiPct)
    expect(after.winRatePct).toBe(before.winRatePct)
  })

  it('rejected withdrawal unlocks funds and leaves historical performance unchanged', async () => {
    const { user, investment, payout } = await seedInvestorWithHistory()
    const before = await performanceService.summary(user.id)

    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    const withdrawAmount = d('500').toFixed(2)
    const otp = await plantWithdrawalOtp(user.id, withdrawAmount, payout.id)
    const wd = await withdrawalService.create(
      user.id,
      {
        amount: withdrawAmount,
        payoutMethodId: payout.id,
        otp,
        idempotencyKey: `wd-perf-rej-${randomUUID()}`,
      },
      {},
    )
    await withdrawalService.review(
      user.id,
      wd.id,
      { decision: 'REJECT', reason: 'QA reject — performance regression' },
      {},
    )

    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(walletAfter.availableBalance).eq(d(walletBefore.availableBalance))).toBe(true)
    expect(d(walletAfter.lockedBalance).eq(0)).toBe(true)

    const after = await performanceService.summary(user.id)
    expect(after.roiPct).toBe(before.roiPct)
    expect(after.bestDay?.returnPct).toBe(before.bestDay?.returnPct)
    expect(after.worstDay?.returnPct).toBe(before.worstDay?.returnPct)
    expect(after.winRatePct).toBe(before.winRatePct)
  })

  it('paid withdrawal (investedAmount→0) must still keep historical return percentages', async () => {
    const { user, investment, payout } = await seedInvestorWithHistory()
    const before = await performanceService.summary(user.id)
    const monthlyBefore = await performanceService.monthly(user.id)
    expect(Number(before.roiPct)).toBeGreaterThan(0)

    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    // Withdraw full invested principal so completion zeros investedAmount.
    const withdrawAmount = d(walletBefore.investedAmount).toFixed(2)
    const otp = await plantWithdrawalOtp(user.id, withdrawAmount, payout.id)
    const wd = await withdrawalService.create(
      user.id,
      {
        amount: withdrawAmount,
        payoutMethodId: payout.id,
        otp,
        idempotencyKey: `wd-perf-paid-${randomUUID()}`,
      },
      {},
    )
    await withdrawalService.review(user.id, wd.id, { decision: 'APPROVE' }, {})
    await withdrawalService.review(user.id, wd.id, { decision: 'PAID' }, {})

    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(walletAfter.investedAmount).eq(0)).toBe(true)

    const after = await performanceService.summary(user.id)
    const monthlyAfter = await performanceService.monthly(user.id)

    // Historical metrics must survive investedAmount reset.
    expect(Number(after.roiPct)).toBeGreaterThan(0)
    expect(after.roiPct).toBe(before.roiPct)
    expect(after.thisMonthReturnPct).toBe(before.thisMonthReturnPct)
    expect(after.winRatePct).toBe(before.winRatePct)
    expect(after.bestDay?.profit).toBe(before.bestDay?.profit)
    expect(Number(after.bestDay?.returnPct ?? 0)).toBeGreaterThan(0)
    expect(monthlyAfter.map((m) => m.returnPct)).toEqual(monthlyBefore.map((m) => m.returnPct))
  })
})
