import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { badRequest, notFound } from '../utils/errors.js'
import { d, moneyDisplay, moneyString } from '../utils/money.js'
import { DEFAULT_USD_INR_RATE, inrStorage, inrToUsd, usdToInr } from '../utils/fx.js'
import { activityService } from './activity.service.js'
import { auditService } from './audit.service.js'
import { singleUserFinance } from './admin-users-finance.js'
import { DEPOSIT_LOCK_DAYS_DEFAULT, computeFundsUnlockAt } from './finance/currency.service.js'
import { ledgerService } from './finance/ledger.service.js'
import { settingsService } from './settings.service.js'

export type HistoricalActivity = 'DEPOSIT' | 'PROFIT' | 'WITHDRAWAL' | 'REFERRAL'

export type AdminUserHistoryRecord = {
  id: string
  activity: HistoricalActivity
  amount: string
  currency: 'USD'
  occurredAt: string
  note: string | null
  reference: string | null
}

export type AdminUserHistoryWallet = {
  balance: string
  available: string
  deposited: string
  profit: string
  withdrawn: string
  referralWallet: string
}

type HistoryBody = {
  activity: HistoricalActivity
  occurredAt: Date
  amount: string
  currency: 'USD' | 'INR'
  note?: string
}

type Ctx = { ip?: string | null; userAgent?: string | null }

const NOTE_FALLBACK = 'Historical record. No payment gateway or payout is called.'

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function depositRef() {
  return `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function withdrawalRef() {
  return `WD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

async function deskRate() {
  try {
    const platform = await settingsService.getOrInitPlatformSettings()
    const rate = platform.usdInrRate ? d(platform.usdInrRate) : DEFAULT_USD_INR_RATE
    return rate.gt(0) ? rate : DEFAULT_USD_INR_RATE
  } catch {
    return DEFAULT_USD_INR_RATE
  }
}

async function resolveUsdAmount(body: HistoryBody) {
  const rate = await deskRate()
  if (body.currency === 'INR') {
    const usd = inrToUsd(body.amount, rate)
    if (!usd.isFinite() || usd.lte(0)) {
      throw badRequest('INR amount converts to zero USD at the current desk rate.')
    }
    return {
      amountUsd: usd,
      amountInr: inrStorage(body.amount),
      rate: rate.toFixed(8),
    }
  }
  const usd = d(body.amount)
  return {
    amountUsd: usd,
    amountInr: inrStorage(usdToInr(usd, rate)),
    rate: rate.toFixed(8),
  }
}

async function historicalPaymentMethodId() {
  const existing = await prisma.paymentMethod.findFirst({
    where: { deletedAt: null },
    orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.paymentMethod.create({
    data: {
      name: 'Historical record',
      type: 'MANUAL',
      instructions: 'Admin historical backfill. No payment gateway is called.',
      isActive: false,
      priority: 9999,
    },
  })
  return created.id
}

async function historicalPayoutMethodId(userId: string) {
  const existing = await prisma.payoutMethod.findFirst({
    where: { userId, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.payoutMethod.create({
    data: {
      userId,
      label: 'Historical record',
      type: 'OTHER',
      details: { historical: true },
      maskedDetails: 'Historical record',
      isDefault: true,
      isVerified: true,
    },
  })
  return created.id
}

async function walletSnapshot(userId: string): Promise<AdminUserHistoryWallet> {
  const [finance, referral] = await Promise.all([
    singleUserFinance(userId),
    prisma.wallet.findUnique({
      where: { userId_kind: { userId, kind: 'REFERRAL' } },
      select: { balance: true },
    }),
  ])
  return {
    balance: finance.walletBalance,
    available: finance.availableBalance,
    deposited: finance.totalDeposited,
    profit: finance.totalProfit,
    withdrawn: finance.totalWithdrawn,
    referralWallet: moneyDisplay(referral?.balance ?? 0),
  }
}

function mapRecord(input: {
  id: string
  activity: HistoricalActivity
  amount: Prisma.Decimal | string
  occurredAt: Date
  note: string | null
  reference: string | null
}): AdminUserHistoryRecord {
  return {
    id: input.id,
    activity: input.activity,
    amount: moneyDisplay(input.amount),
    currency: 'USD',
    occurredAt: input.occurredAt.toISOString(),
    note: input.note,
    reference: input.reference,
  }
}

async function listRecords(userId: string): Promise<AdminUserHistoryRecord[]> {
  const [deposits, withdrawals, profits, rewards, history] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        creditedAmount: true,
        createdAt: true,
        notes: true,
        internalNotes: true,
        reference: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.withdrawal.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        netAmount: true,
        createdAt: true,
        paidAt: true,
        internalNotes: true,
        reference: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.profitDistribution.findMany({
      where: { userId, isReversed: false },
      select: { id: true, amount: true, createdAt: true, date: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referralReward.findMany({
      where: { referrerId: userId },
      select: { id: true, rewardAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transactionHistory.findMany({
      where: { userId, event: 'HISTORICAL_REFERRAL' },
      select: { id: true, amount: true, createdAt: true, message: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const records: AdminUserHistoryRecord[] = [
    ...deposits.map((row) =>
      mapRecord({
        id: row.id,
        activity: 'DEPOSIT',
        amount: row.creditedAmount ?? row.amount,
        occurredAt: row.createdAt,
        note: row.notes ?? row.internalNotes,
        reference: row.reference,
      }),
    ),
    ...withdrawals.map((row) =>
      mapRecord({
        id: row.id,
        activity: 'WITHDRAWAL',
        amount: row.netAmount ?? row.amount,
        occurredAt: row.paidAt ?? row.createdAt,
        note: row.internalNotes,
        reference: row.reference,
      }),
    ),
    ...profits.map((row) =>
      mapRecord({
        id: row.id,
        activity: 'PROFIT',
        amount: row.amount,
        occurredAt: row.createdAt,
        note: null,
        reference: row.date.toISOString().slice(0, 10),
      }),
    ),
    ...rewards.map((row) =>
      mapRecord({
        id: row.id,
        activity: 'REFERRAL',
        amount: row.rewardAmount,
        occurredAt: row.createdAt,
        note: null,
        reference: null,
      }),
    ),
    ...history.map((row) =>
      mapRecord({
        id: row.id,
        activity: 'REFERRAL',
        amount: row.amount ?? '0',
        occurredAt: row.createdAt,
        note: row.message,
        reference: null,
      }),
    ),
  ]

  records.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
  return records
}

async function requireInvestor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, role: true, deletedAt: true },
  })
  if (!user || user.deletedAt) throw notFound('User not found.')
  if (user.role !== 'USER') throw badRequest('Historical records can only be added to investor accounts.')
  return user
}

export const adminUserHistoryService = {
  async get(userId: string) {
    const user = await requireInvestor(userId)
    const [wallet, records] = await Promise.all([walletSnapshot(userId), listRecords(userId)])
    return {
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
      wallet,
      records,
    }
  },

  async create(actorId: string, userId: string, body: HistoryBody, context: Ctx) {
    const user = await requireInvestor(userId)
    if (Number.isNaN(body.occurredAt.getTime())) {
      throw badRequest('Enter a valid historical date and time.')
    }

    const { amountUsd, amountInr } = await resolveUsdAmount(body)
    const note = body.note?.trim() || NOTE_FALLBACK
    const occurredAt = body.occurredAt
    const idempotency = `historical:${body.activity.toLowerCase()}:${userId}:${occurredAt.toISOString()}:${randomUUID()}`

    await ledgerService.ensureWalletsForUser(userId)

    if (body.activity === 'DEPOSIT') {
      const paymentMethodId = await historicalPaymentMethodId()
      await prisma.$transaction(async (tx) => {
        const wallet = await ledgerService.getInvestmentWallet(userId, tx)
        const deposit = await tx.deposit.create({
          data: {
            reference: depositRef(),
            userId,
            walletId: wallet.id,
            paymentMethodId,
            amount: moneyString(amountUsd),
            amountInr,
            creditedAmount: moneyString(amountUsd),
            currency: 'USD',
            lockDays: DEPOSIT_LOCK_DAYS_DEFAULT,
            fundsUnlockAt: computeFundsUnlockAt(occurredAt),
            status: 'APPROVED',
            notes: note,
            internalNotes: NOTE_FALLBACK,
            submissionDetails: {
              historical: true,
              inputCurrency: body.currency,
              inputAmount: body.amount,
            },
            idempotencyKey: idempotency,
            reviewedById: actorId,
            reviewedAt: occurredAt,
            createdAt: occurredAt,
          },
        })
        const txn = await ledgerService.creditAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount: amountUsd,
          entryType: 'DEPOSIT_APPROVED',
          transactionType: 'DEPOSIT',
          description: `Historical deposit ${deposit.reference}`,
          referenceType: 'DEPOSIT',
          referenceId: deposit.id,
          createdById: actorId,
          idempotencyKey: `${idempotency}:ledger`,
          bumpDeposited: true,
          bumpInvested: true,
        })
        await tx.deposit.update({
          where: { id: deposit.id },
          data: { transactionId: txn.id },
        })
        await tx.transactionHistory.create({
          data: {
            transactionId: txn.id,
            userId,
            event: 'HISTORICAL_DEPOSIT',
            status: 'APPROVED',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'DEPOSIT' },
            createdAt: occurredAt,
          },
        })
      })
    } else if (body.activity === 'PROFIT') {
      const day = utcDay(occurredAt)
      await prisma.$transaction(async (tx) => {
        const wallet = await ledgerService.getInvestmentWallet(userId, tx)
        const daily = await tx.dailyReturn.upsert({
          where: { date: day },
          create: { date: day, status: 'DISTRIBUTED' },
          update: {},
        })
        const run = await tx.dailyReturnRun.create({
          data: {
            dailyReturnId: daily.id,
            date: day,
            returnPct: '0',
            returnBasis: 'BALANCE',
            status: 'COMPLETED',
            eligibleWallets: 1,
            processedWallets: 1,
            successfulWallets: 1,
            totalBaseAmount: moneyString(wallet.availableBalance),
            totalDistributed: moneyString(amountUsd),
            notes: NOTE_FALLBACK,
            idempotencyKey: idempotency,
            createdById: actorId,
            startedAt: occurredAt,
            completedAt: occurredAt,
            createdAt: occurredAt,
          },
        })
        const txn = await ledgerService.creditAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount: amountUsd,
          entryType: 'PROFIT_DISTRIBUTION',
          transactionType: 'PROFIT',
          description: `Historical profit ${day.toISOString().slice(0, 10)}`,
          referenceType: 'DAILY_RETURN_RUN',
          referenceId: run.id,
          createdById: actorId,
          idempotencyKey: `${idempotency}:ledger`,
          bumpProfit: true,
        })
        const after = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } })
        await tx.profitDistribution.create({
          data: {
            runId: run.id,
            userId,
            date: day,
            eligibleBalance: moneyString(wallet.availableBalance),
            returnPct: '0',
            grossAmount: moneyString(amountUsd),
            amount: moneyString(amountUsd),
            balanceAfter: moneyString(after.availableBalance),
            ledgerTxnId: txn.id,
            idempotencyKey: `${idempotency}:dist`,
            createdAt: occurredAt,
          },
        })
        await tx.transactionHistory.create({
          data: {
            transactionId: txn.id,
            userId,
            event: 'HISTORICAL_PROFIT',
            status: 'POSTED',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'PROFIT' },
            createdAt: occurredAt,
          },
        })
      })
    } else if (body.activity === 'WITHDRAWAL') {
      const payoutMethodId = await historicalPayoutMethodId(userId)
      await prisma.$transaction(async (tx) => {
        const wallet = await ledgerService.getInvestmentWallet(userId, tx)
        const withdrawal = await tx.withdrawal.create({
          data: {
            reference: withdrawalRef(),
            userId,
            walletId: wallet.id,
            payoutMethodId,
            amount: moneyString(amountUsd),
            amountInr,
            netAmount: moneyString(amountUsd),
            currency: 'USD',
            status: 'PAID',
            destinationLabel: 'Historical record',
            destinationSnapshot: { historical: true },
            internalNotes: note,
            idempotencyKey: idempotency,
            reviewedById: actorId,
            reviewedAt: occurredAt,
            paidAt: occurredAt,
            createdAt: occurredAt,
          },
        })
        const txn = await ledgerService.debitAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount: amountUsd,
          description: `Historical withdrawal ${withdrawal.reference}`,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          createdById: actorId,
          idempotencyKey: `${idempotency}:ledger`,
        })
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            totalWithdrawn: moneyString(d(wallet.totalWithdrawn).plus(amountUsd)),
          },
        })
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { transactionId: txn.id },
        })
        await tx.transactionHistory.create({
          data: {
            transactionId: txn.id,
            userId,
            event: 'HISTORICAL_WITHDRAWAL',
            status: 'PAID',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'WITHDRAWAL' },
            createdAt: occurredAt,
          },
        })
      })
    } else {
      await prisma.$transaction(async (tx) => {
        const wallet = await ledgerService.getReferralWallet(userId, tx)
        const txn = await ledgerService.creditAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount: amountUsd,
          entryType: 'BONUS',
          transactionType: 'REFERRAL_BONUS',
          description: 'Historical referral credit',
          referenceType: 'HISTORICAL_REFERRAL',
          referenceId: userId,
          createdById: actorId,
          idempotencyKey: `${idempotency}:ledger`,
        })
        await tx.transactionHistory.create({
          data: {
            transactionId: txn.id,
            userId,
            event: 'HISTORICAL_REFERRAL',
            status: 'POSTED',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'REFERRAL' },
            createdAt: occurredAt,
          },
        })
      })
    }

    await auditService.record({
      actorId,
      targetUserId: userId,
      action: 'user.history.create',
      module: 'users',
      newValue: {
        activity: body.activity,
        amount: moneyDisplay(amountUsd),
        currency: body.currency,
        occurredAt: occurredAt.toISOString(),
      },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId,
      actorId,
      kind: 'ADMIN_ACTION',
      title: `Historical ${body.activity.toLowerCase()} recorded`,
      metadata: { amount: moneyDisplay(amountUsd), occurredAt: occurredAt.toISOString() },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    const [wallet, records] = await Promise.all([walletSnapshot(userId), listRecords(userId)])
    return {
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
      wallet,
      records,
    }
  },
}
