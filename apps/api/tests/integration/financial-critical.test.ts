/**
 * Regression tests for FINANCIAL_WORKFLOW_AUDIT critical / high money bugs.
 * Requires DATABASE_URL (same as other integration tests).
 */
import { randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll } from 'vitest'

import { d, moneyString } from '../../src/utils/money.js'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('Financial critical regressions', () => {
  let prisma: typeof import('../../src/database/prisma.js').prisma
  let ledgerService: typeof import('../../src/services/finance/ledger.service.js').ledgerService
  let depositService: typeof import('../../src/services/finance/deposit.service.js').depositService
  let withdrawalService: typeof import('../../src/services/finance/withdrawal.service.js').withdrawalService
  let distributionService: typeof import('../../src/services/trading/distribution.service.js').distributionService
  let walletService: typeof import('../../src/services/finance/wallet.service.js').walletService

  beforeAll(async () => {
    ;({ prisma } = await import('../../src/database/prisma.js'))
    ;({ ledgerService } = await import('../../src/services/finance/ledger.service.js'))
    ;({ depositService } = await import('../../src/services/finance/deposit.service.js'))
    ;({ withdrawalService } = await import('../../src/services/finance/withdrawal.service.js'))
    ;({ distributionService } = await import('../../src/services/trading/distribution.service.js'))
    ;({ walletService } = await import('../../src/services/finance/wallet.service.js'))
  })

  async function seedInvestor() {
    const email = `crit_${randomUUID().slice(0, 10)}@example.com`
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'test',
        firstName: 'Crit',
        lastName: 'Test',
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

  async function ensurePaymentMethod() {
    const existing = await prisma.paymentMethod.findFirst({
      where: { isActive: true, deletedAt: null },
    })
    if (existing) return existing
    return prisma.paymentMethod.create({
      data: {
        name: 'QA Wire',
        type: 'BANK_TRANSFER',
        instructions: 'QA',
        minAmount: '1',
        maxAmount: '100000',
        feePct: '0',
        isActive: true,
        priority: 1,
      },
    })
  }

  it('C1: cancel wins over concurrent approve — cancelled deposit is not credited', async () => {
    const { user, investment } = await seedInvestor()
    const method = await ensurePaymentMethod()
    const before = d(investment.availableBalance)

    const deposit = await depositService.create(
      user.id,
      {
        amount: '50.00',
        methodId: method.id,
        idempotencyKey: `dep-c1-${randomUUID()}`,
      },
      {},
    )

    // Cancel first (claims PENDING → CANCELLED under row lock)
    await depositService.cancel(user.id, deposit.id, {})

    // Approve must fail — cannot credit cancelled row (including FORCE_COMPLETE)
    await expect(
      depositService.review(
        user.id,
        deposit.id,
        { decision: 'FORCE_COMPLETE', reason: 'race' },
        {},
      ),
    ).rejects.toThrow(/cannot be approved|current status/i)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(wallet.availableBalance).eq(before)).toBe(true)
    const row = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(row.status).toBe('CANCELLED')
  })

  it('C1/H1: FORCE_CANCEL after APPROVE reverses ledger and investedAmount', async () => {
    const { user, investment } = await seedInvestor()
    const method = await ensurePaymentMethod()

    const deposit = await depositService.create(
      user.id,
      {
        amount: '75.00',
        methodId: method.id,
        idempotencyKey: `dep-h1-${randomUUID()}`,
      },
      {},
    )

    await depositService.review(user.id, deposit.id, { decision: 'APPROVE' }, {})
    const afterApprove = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(afterApprove.availableBalance).gte(d('75'))).toBe(true)
    expect(d(afterApprove.investedAmount).gte(d('75'))).toBe(true)

    await depositService.review(
      user.id,
      deposit.id,
      { decision: 'FORCE_CANCEL', reason: 'ops reverse' },
      {},
    )

    const afterCancel = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(afterCancel.availableBalance).eq(d(afterApprove.availableBalance).minus(75))).toBe(
      true,
    )
    expect(d(afterCancel.investedAmount).eq(d(afterApprove.investedAmount).minus(75))).toBe(true)
    const row = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(row.status).toBe('CANCELLED')
  })

  it('C2: second distribution key for same date+basis is allowed (unlimited publishes)', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `admin_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'test',
        firstName: 'Admin',
        lastName: 'Dist',
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
        kycStatus: 'APPROVED',
        emailVerifiedAt: new Date(),
        timezone: 'UTC',
      },
    })

    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - Math.floor(Math.random() * 200) - 1)
    const dateLabel = date.toISOString().slice(0, 10)

    const key1 = `run-c2-a-${randomUUID()}`
    const key2 = `run-c2-b-${randomUUID()}`

    const first = await distributionService.publishReturn(
      admin.id,
      { date: dateLabel, returnPct: '0.10', idempotencyKey: key1 },
      {},
    )
    const second = await distributionService.publishReturn(
      admin.id,
      { date: dateLabel, returnPct: '0.10', idempotencyKey: key2 },
      {},
    )

    expect(first.status).toBe('COMPLETED')
    expect(second.status).toBe('COMPLETED')
    expect(second.id).not.toBe(first.id)

    const runs = await prisma.dailyReturnRun.count({
      where: { date, returnBasis: 'INVESTED', status: 'COMPLETED' },
    })
    expect(runs).toBeGreaterThanOrEqual(2)
  })

  it('C3: completing a withdrawal decreases investedAmount', async () => {
    const { user, investment } = await seedInvestor()

    await prisma.$transaction(async (tx) => {
      await ledgerService.creditAvailable(tx, {
        userId: user.id,
        walletId: investment.id,
        amount: d('200'),
        entryType: 'ADJUSTMENT_CREDIT',
        transactionType: 'ADMIN_ADJUSTMENT',
        description: 'seed',
        referenceType: 'ADMIN_ADJUSTMENT',
        referenceId: user.id,
        createdById: user.id,
        idempotencyKey: `seed-c3-${randomUUID()}`,
        bumpInvested: true,
        bumpDeposited: true,
      })
    })

    const before = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(before.investedAmount).gte(d('200'))).toBe(true)

    const payout = await prisma.payoutMethod.create({
      data: {
        userId: user.id,
        label: 'QA USDT',
        type: 'USDT_TRC20',
        details: { address: 'TQA' },
        maskedDetails: 'TQA••••',
        isDefault: true,
        isVerified: true,
      },
    })

    const wd = await withdrawalService.create(
      user.id,
      {
        amount: '40.00',
        payoutMethodId: payout.id,
        idempotencyKey: `wd-c3-${randomUUID()}`,
      },
      {},
    )

    await withdrawalService.review(user.id, wd.id, { decision: 'APPROVE' }, {})
    await withdrawalService.review(user.id, wd.id, { decision: 'PAID' }, {})

    const after = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(after.investedAmount).eq(d(before.investedAmount).minus(40))).toBe(true)
    expect(d(after.totalWithdrawn).gte(d('40'))).toBe(true)
  })

  it('H2: admin adjust with same idempotency key does not double-credit', async () => {
    const { user, investment } = await seedInvestor()
    const key = `adj-h2-${randomUUID()}`
    const before = d(investment.availableBalance)

    await walletService.adminAdjust(user.id, user.id, {
      amount: '25.00',
      direction: 'CREDIT',
      reason: 'QA adjust once',
      idempotencyKey: key,
    })
    await walletService.adminAdjust(user.id, user.id, {
      amount: '25.00',
      direction: 'CREDIT',
      reason: 'QA adjust retry',
      idempotencyKey: key,
    })

    const after = await prisma.wallet.findUniqueOrThrow({ where: { id: investment.id } })
    expect(d(after.availableBalance).eq(before.plus(25))).toBe(true)
  })

  it('H4: concurrent withdrawals cannot exceed daily limit', async () => {
    const { user, investment } = await seedInvestor()

    await prisma.$transaction(async (tx) => {
      await ledgerService.creditAvailable(tx, {
        userId: user.id,
        walletId: investment.id,
        amount: d('120000'),
        entryType: 'ADJUSTMENT_CREDIT',
        transactionType: 'ADMIN_ADJUSTMENT',
        description: 'seed limit',
        referenceType: 'ADMIN_ADJUSTMENT',
        referenceId: user.id,
        createdById: user.id,
        idempotencyKey: `seed-h4-${randomUUID()}`,
        bumpInvested: true,
      })
    })

    const payout = await prisma.payoutMethod.create({
      data: {
        userId: user.id,
        label: 'QA Limit',
        type: 'USDT_TRC20',
        details: { address: 'TLIM' },
        maskedDetails: 'TLIM••••',
        isDefault: true,
        isVerified: true,
      },
    })

    // Daily limit is 50000 — two parallel 30000 should yield one success and one failure.
    const results = await Promise.allSettled([
      withdrawalService.create(
        user.id,
        {
          amount: '30000.00',
          payoutMethodId: payout.id,
          idempotencyKey: `wd-h4-a-${randomUUID()}`,
        },
        {},
      ),
      withdrawalService.create(
        user.id,
        {
          amount: '30000.00',
          payoutMethodId: payout.id,
          idempotencyKey: `wd-h4-b-${randomUUID()}`,
        },
        {},
      ),
    ])

    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.filter((r) => r.status === 'rejected').length
    expect(ok).toBe(1)
    expect(fail).toBe(1)

    const open = await prisma.withdrawal.count({
      where: {
        userId: user.id,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
        amount: moneyString(d('30000')),
      },
    })
    expect(open).toBe(1)
  })
})
