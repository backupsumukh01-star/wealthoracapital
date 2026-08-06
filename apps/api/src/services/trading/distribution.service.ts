import type { DailyReturnRun, ReturnBasis } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { ledgerService } from '../finance/ledger.service.js'
import { notificationService } from '../notification.service.js'
import { opsAlertService } from '../ops-alert.service.js'
import { badRequest, conflict, notFound } from '../../utils/errors.js'
import { d, moneyDisplay, moneyString } from '../../utils/money.js'
import { mapDailyReturn, mapDailyReturnRun, mapProfitDistribution } from './trade.mappers.js'
import { tradeService } from './trade.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function dayDate(input: string | Date): Date {
  const d0 = new Date(input)
  d0.setUTCHours(0, 0, 0, 0)
  return d0
}

export const distributionService = {
  async listRuns() {
    const items = await prisma.dailyReturnRun.findMany({
      orderBy: { date: 'desc' },
      take: 100,
    })
    return { items: items.map(mapDailyReturnRun) }
  },

  async listDailyReturns() {
    const items = await prisma.dailyReturn.findMany({ orderBy: { date: 'desc' }, take: 100 })
    return { items: items.map(mapDailyReturn) }
  },

  async listInvestorDistributions(userId: string) {
    const items = await prisma.profitDistribution.findMany({
      where: { userId, isReversed: false },
      orderBy: { date: 'desc' },
      take: 100,
    })
    return { items: items.map(mapProfitDistribution) }
  },

  async listInvestorReturns(userId: string) {
    return this.listInvestorDistributions(userId)
  },

  /**
   * Preview or apply a daily return distribution.
   * Idempotent via idempotencyKey on DailyReturnRun.
   * FAILED / PROCESSING runs resume with the same key (no double-pay via new keys).
   */
  async publishReturn(
    actorId: string,
    body: {
      date: string
      returnPct: string
      idempotencyKey: string
      returnBasis?: ReturnBasis
      preview?: boolean
    },
    context: Ctx,
  ) {
    const date = dayDate(body.date)
    const returnPct = d(body.returnPct)
    if (!returnPct.isFinite()) throw badRequest('Invalid returnPct.')
    const basis: ReturnBasis = body.returnBasis ?? 'BALANCE'

    const existing = await prisma.dailyReturnRun.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
    })
    if (existing?.status === 'COMPLETED') {
      return mapDailyReturnRun(existing)
    }
    if (existing && existing.status !== 'FAILED' && existing.status !== 'PROCESSING') {
      return mapDailyReturnRun(existing)
    }

    // Ensure daily return row exists (from closed trades or empty)
    await tradeService.recomputeDailyReturn(date)
    const daily = await prisma.dailyReturn.findUnique({ where: { date } })
    if (!daily) throw notFound('Daily return day not found.')

    // Block a second key for the same date+basis when a run already completed or is open.
    // Soft check first; DB unique(date, returnBasis) is the hard gate (C2).
    const priorBlocking = await prisma.dailyReturnRun.findFirst({
      where: {
        date,
        returnBasis: basis,
        NOT: existing ? { id: existing.id } : undefined,
      },
    })
    if (priorBlocking && !body.preview) {
      if (priorBlocking.status === 'COMPLETED') {
        throw conflict(
          'A completed distribution already exists for this date. Profit reversal is not available; contact operations for manual ledger repair.',
        )
      }
      if (priorBlocking.idempotencyKey !== body.idempotencyKey) {
        throw conflict(
          'A distribution run for this date is already in progress or failed. Resume with the original idempotency key.',
        )
      }
    }

    const wallets = await prisma.wallet.findMany({
      where: {
        kind: 'INVESTMENT',
        user: { status: 'ACTIVE', kycStatus: 'APPROVED', role: 'USER' },
      },
    })

    const eligible = wallets
      .map((w) => {
        const base = basis === 'INVESTED' ? d(w.investedAmount) : d(w.availableBalance).plus(d(w.lockedBalance))
        return { wallet: w, base }
      })
      .filter((row) => row.base.gt(0))

    let totalBase = d(0)
    let totalGross = d(0)
    const lines = eligible.map((row) => {
      const gross = row.base.mul(returnPct).div(100)
      const amount = gross.toDecimalPlaces(2)
      totalBase = totalBase.plus(row.base)
      totalGross = totalGross.plus(amount)
      return { ...row, gross, amount }
    })
    const roundingDelta = lines
      .reduce((acc, l) => acc.plus(l.gross.minus(l.amount)), d(0))
      .toDecimalPlaces(8)

    if (body.preview) {
      return {
        id: 'preview',
        date: date.toISOString().slice(0, 10),
        returnPct: returnPct.toFixed(6),
        returnBasis: basis,
        status: 'PENDING' as const,
        eligibleWallets: lines.length,
        processedWallets: 0,
        totalBaseAmount: moneyDisplay(totalBase),
        totalDistributed: moneyDisplay(totalGross),
        roundingDelta: moneyDisplay(roundingDelta),
        startedAt: null,
        completedAt: null,
      }
    }

    // Negative return: still record distributions as negative amounts without ledger debit for now
    // (capital protection — losses tracked in performance, not forced wallet debit in v1)
    let run: DailyReturnRun
    try {
      if (existing && (existing.status === 'FAILED' || existing.status === 'PROCESSING')) {
        run = await prisma.dailyReturnRun.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            completedAt: null,
            startedAt: existing.startedAt ?? new Date(),
          },
        })
      } else {
        run = await prisma.dailyReturnRun.create({
          data: {
            dailyReturnId: daily.id,
            date,
            returnPct: returnPct.toFixed(6),
            returnBasis: basis,
            status: 'PROCESSING',
            eligibleWallets: lines.length,
            processedWallets: 0,
            totalBaseAmount: moneyString(totalBase),
            totalDistributed: moneyString(0),
            roundingDelta: moneyString(roundingDelta),
            idempotencyKey: body.idempotencyKey,
            createdById: actorId,
            startedAt: new Date(),
          },
        })
      }
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        throw conflict(
          'A distribution run for this date and return basis already exists. Resume with the original idempotency key.',
        )
      }
      throw err
    }

    const alreadyPaid = await prisma.profitDistribution.findMany({
      where: { runId: run.id },
      select: { idempotencyKey: true, amount: true },
    })
    const paidKeys = new Set(alreadyPaid.map((row) => row.idempotencyKey))
    let processed = alreadyPaid.length
    let distributed = alreadyPaid.reduce((acc, row) => {
      const amt = d(row.amount)
      return amt.gt(0) ? acc.plus(amt) : acc
    }, d(0))

    try {
      for (const line of lines) {
        const idempotencyKey = `run:${run.id}:wallet:${line.wallet.id}`
        if (paidKeys.has(idempotencyKey)) {
          continue
        }

        await prisma.$transaction(async (tx) => {
          let ledgerTxnId: string | null = null
          let balanceAfter = d(line.wallet.availableBalance)

          if (line.amount.gt(0)) {
            await ledgerService.ensureWalletsForUser(line.wallet.userId, tx)
            const txn = await ledgerService.creditAvailable(tx, {
              userId: line.wallet.userId,
              walletId: line.wallet.id,
              amount: line.amount,
              entryType: 'PROFIT_DISTRIBUTION',
              transactionType: 'PROFIT',
              description: `Daily return ${date.toISOString().slice(0, 10)} @ ${returnPct.toFixed(6)}%`,
              referenceType: 'DAILY_RETURN_RUN',
              referenceId: run.id,
              createdById: actorId,
              idempotencyKey,
              bumpProfit: true,
            })
            // Only bump the profit-wallet aggregate on a newly posted ledger credit.
            const existingDist = await tx.profitDistribution.findUnique({
              where: { idempotencyKey },
            })
            if (!existingDist) {
              const profitWallet = await tx.wallet.findUniqueOrThrow({
                where: { userId_kind: { userId: line.wallet.userId, kind: 'PROFIT' } },
              })
              await tx.wallet.update({
                where: { id: profitWallet.id },
                data: { totalProfit: moneyString(d(profitWallet.totalProfit).plus(line.amount)) },
              })
            }
            const inv = await tx.wallet.findUniqueOrThrow({ where: { id: line.wallet.id } })
            ledgerTxnId = txn.id
            balanceAfter = d(inv.availableBalance)
          } else if (line.amount.lt(0)) {
            // Record loss in performance only; do not force negative ledger debit in v1
            balanceAfter = d(line.wallet.availableBalance)
          }

          const existingDist = await tx.profitDistribution.findUnique({
            where: { idempotencyKey },
          })
          if (!existingDist) {
            await tx.profitDistribution.create({
              data: {
                runId: run.id,
                userId: line.wallet.userId,
                date,
                eligibleBalance: moneyString(line.base),
                returnPct: returnPct.toFixed(6),
                grossAmount: moneyString(line.gross),
                amount: moneyString(line.amount),
                balanceAfter: moneyString(balanceAfter),
                ledgerTxnId,
                idempotencyKey,
              },
            })
          }
        })

        await notificationService.notify({
          userId: line.wallet.userId,
          kind: 'TRADING',
          title: line.amount.gte(0) ? 'Daily profit' : 'Daily loss',
          body: `Today's return: ${returnPct.toFixed(2)}% · ${moneyDisplay(line.amount)}`,
          metadata: {
            type: line.amount.gte(0) ? 'DAILY_PROFIT' : 'DAILY_LOSS',
            runId: run.id,
            amount: moneyDisplay(line.amount),
          },
        })

        processed += 1
        distributed = distributed.plus(line.amount.gt(0) ? line.amount : d(0))

        await prisma.dailyReturnRun.update({
          where: { id: run.id },
          data: {
            processedWallets: processed,
            totalDistributed: moneyString(distributed),
          },
        })
      }

      const completed = await prisma.dailyReturnRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          processedWallets: processed,
          totalDistributed: moneyString(distributed),
          completedAt: new Date(),
        },
      })

      await prisma.dailyReturn.update({
        where: { id: daily.id },
        data: {
          status: 'DISTRIBUTED',
          netReturnPct: returnPct.toFixed(6),
        },
      })

      await activityService.record({
        userId: actorId,
        actorId,
        kind: 'DISTRIBUTION_COMPLETE',
        title: `Daily return applied ${date.toISOString().slice(0, 10)}`,
        description: `${moneyDisplay(distributed)} across ${processed} wallets`,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await auditService.record({
        actorId,
        action: 'returns.publish',
        module: 'trading',
        newValue: {
          runId: run.id,
          date: date.toISOString().slice(0, 10),
          returnPct: returnPct.toFixed(6),
          distributed: moneyDisplay(distributed),
        },
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await opsAlertService.notify({
        event: 'ROI_DISTRIBUTED',
        title: 'Daily ROI distribution completed',
        action: `Distributed ${moneyDisplay(distributed)} across ${processed} wallets`,
        amount: moneyDisplay(distributed),
        reference: run.id,
        ip: context.ip,
        adminPath: `/admin/daily-return`,
        details: {
          Date: date.toISOString().slice(0, 10),
          'Return %': returnPct.toFixed(4),
          Wallets: String(processed),
        },
      })

      // Snapshots + performance refresh
      const { performanceService } = await import('./performance.service.js')
      await performanceService.snapshotAllForDate(date)
      await performanceService.recalculateGlobal()

      return mapDailyReturnRun(completed)
    } catch (err) {
      await prisma.dailyReturnRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          processedWallets: processed,
          totalDistributed: moneyString(distributed),
          completedAt: new Date(),
        },
      })
      throw err
    }
  },
}
