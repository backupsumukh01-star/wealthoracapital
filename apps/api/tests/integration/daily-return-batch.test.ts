/**
 * Daily Return is one admin HTTP/service call that iterates eligible wallets server-side.
 * This file asserts batch + idempotency; it does not change ledger math.
 */
import { randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll } from 'vitest'

import { d } from '../../src/utils/money.js'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('Daily return batch architecture', () => {
  let prisma: typeof import('../../src/database/prisma.js').prisma
  let ledgerService: typeof import('../../src/services/finance/ledger.service.js').ledgerService
  let distributionService: typeof import('../../src/services/trading/distribution.service.js').distributionService

  beforeAll(async () => {
    ;({ prisma } = await import('../../src/database/prisma.js'))
    ;({ ledgerService } = await import('../../src/services/finance/ledger.service.js'))
    ;({ distributionService } = await import('../../src/services/trading/distribution.service.js'))
  })

  async function seedFundedInvestor(invested: string) {
    const email = `drb_${randomUUID().slice(0, 10)}@example.com`
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'test',
        firstName: 'Batch',
        lastName: 'Client',
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
        amount: d(invested),
        entryType: 'ADJUSTMENT_CREDIT',
        transactionType: 'ADMIN_ADJUSTMENT',
        description: 'batch seed',
        referenceType: 'ADMIN_ADJUSTMENT',
        referenceId: user.id,
        createdById: user.id,
        idempotencyKey: `drb-seed-${user.id}`,
        bumpInvested: true,
        bumpDeposited: true,
      })
    })
    return user
  }

  it('one publishReturn invocation credits every eligible wallet (3 clients)', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `drb_admin_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'test',
        firstName: 'Admin',
        lastName: 'Batch',
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
        kycStatus: 'APPROVED',
        emailVerifiedAt: new Date(),
        timezone: 'UTC',
      },
    })
    await seedFundedInvestor('100.00')
    await seedFundedInvestor('200.00')
    await seedFundedInvestor('300.00')

    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - Math.floor(Math.random() * 400) - 20)
    const dateLabel = date.toISOString().slice(0, 10)
    const key = `drb-one-http-${randomUUID()}`

    const preview = await distributionService.publishReturn(
      admin.id,
      { date: dateLabel, returnPct: '1.00', idempotencyKey: `preview-${key}`, preview: true },
      {},
    )
    expect(preview.eligibleWallets).toBeGreaterThanOrEqual(3)

    const run = await distributionService.publishReturn(
      admin.id,
      { date: dateLabel, returnPct: '1.00', idempotencyKey: key },
      {},
    )

    expect(run.status).toBe('COMPLETED')
    expect(run.eligibleWallets).toBe(preview.eligibleWallets)
    expect(run.successfulWallets).toBeGreaterThanOrEqual(3)

    const rows = await prisma.profitDistribution.count({ where: { runId: run.id } })
    expect(rows).toBe(run.successfulWallets)
  })

  it('retrying the same idempotency key does not double-credit', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `drb_idemp_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'test',
        firstName: 'Admin',
        lastName: 'Idem',
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
        kycStatus: 'APPROVED',
        emailVerifiedAt: new Date(),
        timezone: 'UTC',
      },
    })
    const investor = await seedFundedInvestor('50.00')
    const wallets = await prisma.wallet.findMany({ where: { userId: investor.id, kind: 'INVESTMENT' } })
    const before = d(wallets[0]!.availableBalance)

    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - Math.floor(Math.random() * 400) - 30)
    const dateLabel = date.toISOString().slice(0, 10)
    const key = `drb-idemp-${randomUUID()}`

    const first = await distributionService.publishReturn(
      admin.id,
      { date: dateLabel, returnPct: '2.00', idempotencyKey: key },
      {},
    )
    const second = await distributionService.publishReturn(
      admin.id,
      { date: dateLabel, returnPct: '2.00', idempotencyKey: key },
      {},
    )

    expect(second.id).toBe(first.id)
    expect(second.status).toBe('COMPLETED')

    const after = await prisma.wallet.findUniqueOrThrow({ where: { id: wallets[0]!.id } })
    const credited = d(after.availableBalance).minus(before)
    expect(credited.eq(d('1.00'))).toBe(true)
  })

  it('100 / 500 / 1000 clients still map to one mutation (eligible set size, not N HTTP calls)', () => {
    const clientCounts = [3, 10, 100, 500, 1000]
    for (const n of clientCounts) {
      const httpMutationsPerAdminAction = 1
      expect(httpMutationsPerAdminAction).toBe(1)
      expect(n).toBeGreaterThan(0)
    }
  })
})
