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
  reference?: string
  userReference?: string
  returnPct?: string
  idempotencyKey?: string
  source?: 'ADMIN_BACKFILL' | 'HISTORICAL_IMPORT'
}

type Ctx = { ip?: string | null; userAgent?: string | null }

const NOTE_FALLBACK = 'Operator backfill. Hidden from admin queues.'

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
    where: { deletedAt: null, isActive: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.paymentMethod.create({
    data: {
      name: 'USDT TRC20',
      type: 'CRYPTO',
      instructions: 'Crypto deposit',
      isActive: true,
      priority: 10,
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
      label: 'USDT wallet',
      type: 'OTHER',
      details: { historical: true },
      maskedDetails: 'USDT TRC20 ••••DEMO',
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

async function runHistoryTx<T>(
  tx: Prisma.TransactionClient | undefined,
  fn: (client: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (tx) return fn(tx)
  return prisma.$transaction(fn)
}

async function requireInvestor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      deletedAt: true,
      createdByAdminId: true,
    },
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
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        createdByAdminId: user.createdByAdminId,
      },
      wallet,
      records,
    }
  },

  async create(
    actorId: string,
    userId: string,
    body: HistoryBody,
    context: Ctx,
    options?: { tx?: Prisma.TransactionClient; skipSideEffects?: boolean },
  ) {
    const user = await requireInvestor(userId)
    if (Number.isNaN(body.occurredAt.getTime())) {
      throw badRequest('Enter a valid historical date and time.')
    }

    const { amountUsd, amountInr } = await resolveUsdAmount(body)
    const note = body.note?.trim() || NOTE_FALLBACK
    const occurredAt = body.occurredAt
    let depositReference: string | null = null
    let withdrawalReference: string | null = null
    const stamp = occurredAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
    const nonce = randomUUID().replace(/-/g, '').slice(0, 10)
    const idempotency =
      body.idempotencyKey?.slice(0, 120) ||
      `h:${body.activity.toLowerCase().slice(0, 3)}:${userId.replace(/-/g, '')}:${stamp}:${nonce}`
    const source = body.source ?? 'ADMIN_BACKFILL'
    const customRef = body.reference?.trim().toUpperCase().slice(0, 32) || null

    await ledgerService.ensureWalletsForUser(userId)

    if (body.activity === 'DEPOSIT') {
      const paymentMethodId = await historicalPaymentMethodId()
      depositReference = await runHistoryTx(options?.tx, async (tx) => {
        const wallet = await ledgerService.getInvestmentWallet(userId, tx)
        const deposit = await tx.deposit.create({
          data: {
            reference: customRef || depositRef(),
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
            userReference: body.userReference?.trim().slice(0, 120) || null,
            notes: body.note?.trim() || null,
            internalNotes: NOTE_FALLBACK,
            submissionDetails: {
              historical: true,
              source,
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
          description: `Deposit ${deposit.reference}`,
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
            event: 'DEPOSIT_PROVIDER_CONFIRMED',
            status: 'APPROVED',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: `Deposit ${deposit.reference} confirmed`,
            metadata: { historical: true, activity: 'DEPOSIT', source },
            createdAt: occurredAt,
          },
        })
        return deposit.reference
      })
    } else if (body.activity === 'PROFIT') {
      const day = utcDay(occurredAt)
      const profitPct = body.returnPct?.trim() || '0'
      await runHistoryTx(options?.tx, async (tx) => {
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
            returnPct: profitPct,
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
          description: `Daily profit ${day.toISOString().slice(0, 10)}`,
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
            returnPct: profitPct,
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
            event: 'DAILY_RETURN_APPLIED',
            status: 'POSTED',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'PROFIT', source },
            createdAt: occurredAt,
          },
        })
      })
    } else if (body.activity === 'WITHDRAWAL') {
      const payoutMethodId = await historicalPayoutMethodId(userId)
      withdrawalReference = await runHistoryTx(options?.tx, async (tx) => {
        const wallet = await ledgerService.getInvestmentWallet(userId, tx)
        const withdrawal = await tx.withdrawal.create({
          data: {
            reference: customRef || withdrawalRef(),
            userId,
            walletId: wallet.id,
            payoutMethodId,
            amount: moneyString(amountUsd),
            amountInr,
            netAmount: moneyString(amountUsd),
            currency: 'USD',
            status: 'PAID',
            destinationLabel: 'USDT wallet',
            destinationSnapshot: { historical: true, source },
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
          description: `Withdrawal ${withdrawal.reference}`,
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
            event: 'WITHDRAWAL_PAID',
            status: 'PAID',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'WITHDRAWAL', source },
            createdAt: occurredAt,
          },
        })
        return withdrawal.reference
      })
    } else {
      await runHistoryTx(options?.tx, async (tx) => {
        const wallet = await ledgerService.getReferralWallet(userId, tx)
        const txn = await ledgerService.creditAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount: amountUsd,
          entryType: 'BONUS',
          transactionType: 'REFERRAL_BONUS',
          description: 'Referral bonus credited',
          referenceType: 'HISTORICAL_REFERRAL',
          referenceId: userId,
          createdById: actorId,
          idempotencyKey: `${idempotency}:ledger`,
        })
        await tx.transactionHistory.create({
          data: {
            transactionId: txn.id,
            userId,
            event: 'REFERRAL_BONUS',
            status: 'POSTED',
            amount: moneyString(amountUsd),
            currency: 'USD',
            message: note,
            metadata: { historical: true, activity: 'REFERRAL', source },
            createdAt: occurredAt,
          },
        })
      })
    }

    if (!options?.skipSideEffects) {
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
    const confirmedAt = new Date(occurredAt.getTime() + 1000)
    if (body.activity === 'DEPOSIT' && depositReference) {
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'DEPOSIT_SUBMITTED',
        title: 'Deposit submitted',
        description: depositReference,
        metadata: { amount: moneyDisplay(amountUsd), occurredAt: occurredAt.toISOString() },
        ip: context.ip,
        userAgent: context.userAgent,
        createdAt: occurredAt,
      })
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'DEPOSIT_APPROVED',
        title: 'Deposit confirmed by provider',
        description: depositReference,
        metadata: { amount: moneyDisplay(amountUsd), occurredAt: confirmedAt.toISOString() },
        ip: context.ip,
        userAgent: context.userAgent,
        createdAt: confirmedAt,
      })
    } else if (body.activity === 'WITHDRAWAL' && withdrawalReference) {
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'WITHDRAWAL_SUBMITTED',
        title: 'Withdrawal submitted',
        description: withdrawalReference,
        metadata: { amount: moneyDisplay(amountUsd), occurredAt: occurredAt.toISOString() },
        ip: context.ip,
        userAgent: context.userAgent,
        createdAt: occurredAt,
      })
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'WITHDRAWAL_PAID',
        title: 'Withdrawal paid',
        description: withdrawalReference,
        metadata: { amount: moneyDisplay(amountUsd), occurredAt: confirmedAt.toISOString() },
        ip: context.ip,
        userAgent: context.userAgent,
        createdAt: confirmedAt,
      })
    } else if (body.activity === 'PROFIT') {
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'DAILY_RETURN_APPLIED',
        title: 'Daily profit credited',
        description: `Profit ${moneyDisplay(amountUsd)}`,
        metadata: { amount: moneyDisplay(amountUsd), occurredAt: occurredAt.toISOString() },
        ip: context.ip,
        userAgent: context.userAgent,
        createdAt: occurredAt,
      })
    } else {
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'WALLET_ADJUSTMENT',
        title: 'Referral bonus credited',
        description: moneyDisplay(amountUsd),
        metadata: { amount: moneyDisplay(amountUsd), occurredAt: occurredAt.toISOString() },
        ip: context.ip,
        userAgent: context.userAgent,
        createdAt: occurredAt,
      })
    }
    }

    if (options?.skipSideEffects) {
      return {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          createdByAdminId: user.createdByAdminId,
        },
        wallet: {
          balance: '0',
          available: '0',
          deposited: '0',
          profit: '0',
          withdrawn: '0',
          referralWallet: '0',
        },
        records: [],
      }
    }

    const [wallet, records] = await Promise.all([walletSnapshot(userId), listRecords(userId)])
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        createdByAdminId: user.createdByAdminId,
      },
      wallet,
      records,
    }
  },

  async createMany(
    actorId: string,
    userId: string,
    rows: HistoryBody[],
    context: Ctx,
  ) {
    await requireInvestor(userId)
    await ledgerService.ensureWalletsForUser(userId)
    await prisma.$transaction(
      async (tx) => {
        for (const body of rows) {
          await adminUserHistoryService.create(actorId, userId, body, context, {
            tx,
            skipSideEffects: true,
          })
        }
      },
      { timeout: 120_000, maxWait: 20_000 },
    )
    for (const body of rows) {
      const occurredAt = body.occurredAt
      const orderId = body.reference?.trim().toUpperCase() || null
      if (body.activity === 'DEPOSIT') {
        await activityService.record({
          userId,
          actorId: userId,
          kind: 'DEPOSIT_SUBMITTED',
          title: 'Deposit submitted',
          description: orderId,
          ip: context.ip,
          userAgent: context.userAgent,
          createdAt: occurredAt,
        })
        await activityService.record({
          userId,
          actorId: userId,
          kind: 'DEPOSIT_APPROVED',
          title: 'Deposit confirmed by provider',
          description: orderId,
          ip: context.ip,
          userAgent: context.userAgent,
          createdAt: new Date(occurredAt.getTime() + 1000),
        })
      } else if (body.activity === 'WITHDRAWAL') {
        await activityService.record({
          userId,
          actorId: userId,
          kind: 'WITHDRAWAL_SUBMITTED',
          title: 'Withdrawal submitted',
          description: orderId,
          ip: context.ip,
          userAgent: context.userAgent,
          createdAt: occurredAt,
        })
        await activityService.record({
          userId,
          actorId: userId,
          kind: 'WITHDRAWAL_PAID',
          title: 'Withdrawal paid',
          description: orderId,
          ip: context.ip,
          userAgent: context.userAgent,
          createdAt: new Date(occurredAt.getTime() + 1000),
        })
      } else if (body.activity === 'PROFIT') {
        await activityService.record({
          userId,
          actorId: userId,
          kind: 'DAILY_RETURN_APPLIED',
          title: 'Daily profit credited',
          description: `Profit ${body.amount}`,
          ip: context.ip,
          userAgent: context.userAgent,
          createdAt: occurredAt,
        })
      } else {
        await activityService.record({
          userId,
          actorId: userId,
          kind: 'WALLET_ADJUSTMENT',
          title: 'Referral bonus credited',
          description: body.amount,
          ip: context.ip,
          userAgent: context.userAgent,
          createdAt: occurredAt,
        })
      }
    }
    await auditService.record({
      actorId,
      targetUserId: userId,
      action: 'user.history.import',
      module: 'users',
      newValue: { rows: rows.length },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.get(userId)
  },
}
