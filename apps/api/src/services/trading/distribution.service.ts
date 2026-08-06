import type { DailyReturnRun, ReturnBasis, Wallet } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { transactionalMailer } from '../../emails/transactional.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { ledgerService } from '../finance/ledger.service.js'
import { notificationService } from '../notification.service.js'
import { opsAlertService } from '../ops-alert.service.js'
import { badRequest, conflict, notFound } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { d, moneyDisplay, moneyString, type Decimal } from '../../utils/money.js'
import { mapDailyReturn, mapDailyReturnRun, mapProfitDistribution } from './trade.mappers.js'
import { tradeService } from './trade.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function dayDate(input: string | Date): Date {
  const d0 = new Date(input)
  d0.setUTCHours(0, 0, 0, 0)
  return d0
}

/**
 * Active investment for settlement.
 * Prefer investedAmount (principal). Fall back to liquid balances so funded wallets
 * are never skipped when investedAmount was not bumped historically.
 */
function activeInvestment(wallet: Wallet, basis: ReturnBasis): Decimal {
  const invested = d(wallet.investedAmount)
  const liquid = d(wallet.availableBalance).plus(d(wallet.lockedBalance))
  if (basis === 'INVESTED') {
    return invested.gt(0) ? invested : liquid
  }
  return liquid.gt(0) ? liquid : invested
}

export const distributionService = {
  async listRuns() {
    const items = await prisma.dailyReturnRun.findMany({
      orderBy: { date: 'desc' },
      take: 100,
    })
    const actorIds = [...new Set(items.map((r) => r.createdById).filter(Boolean))] as string[]
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : []
    const byId = new Map(actors.map((a) => [a.id, a]))
    return {
      items: items.map((run) => {
        const actor = run.createdById ? byId.get(run.createdById) : null
        const appliedBy = actor
          ? `${actor.firstName} ${actor.lastName}`.trim() || actor.email
          : null
        return mapDailyReturnRun(run, { appliedBy })
      }),
    }
  },

  async getRun(id: string) {
    const run = await prisma.dailyReturnRun.findUnique({ where: { id } })
    if (!run) throw notFound('Settlement run not found.')
    let appliedBy: string | null = null
    if (run.createdById) {
      const actor = await prisma.user.findUnique({
        where: { id: run.createdById },
        select: { firstName: true, lastName: true, email: true },
      })
      if (actor) {
        appliedBy = `${actor.firstName} ${actor.lastName}`.trim() || actor.email
      }
    }
    const distributions = await prisma.profitDistribution.findMany({
      where: { runId: run.id },
      orderBy: { createdAt: 'asc' },
      take: 500,
    })
    return {
      ...mapDailyReturnRun(run, { appliedBy }),
      distributions: distributions.map(mapProfitDistribution),
    }
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
   * - Default basis: INVESTED (active investment × pct / 100)
   * - Per-user atomic credit; failures are logged and skipped (no full rollback)
   * - One completed settlement per calendar day + basis
   */
  async publishReturn(
    actorId: string,
    body: {
      date: string
      returnPct: string
      idempotencyKey: string
      returnBasis?: ReturnBasis
      preview?: boolean
      notes?: string
    },
    context: Ctx,
  ) {
    const date = dayDate(body.date)
    const dateLabel = date.toISOString().slice(0, 10)
    const returnPct = d(body.returnPct)
    if (!returnPct.isFinite()) throw badRequest('Invalid returnPct.')
    // Product rule: profit = activeInvestment × dailyPercentage / 100
    const basis: ReturnBasis = body.returnBasis ?? 'INVESTED'

    logger.info(
      {
        date: dateLabel,
        returnPct: returnPct.toFixed(6),
        basis,
        actorId,
        preview: Boolean(body.preview),
        idempotencyKey: body.idempotencyKey,
      },
      'Settlement Started',
    )

    const existing = await prisma.dailyReturnRun.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
    })
    if (existing?.status === 'COMPLETED') {
      return mapDailyReturnRun(existing)
    }
    if (existing && existing.status !== 'FAILED' && existing.status !== 'PROCESSING') {
      return mapDailyReturnRun(existing)
    }

    await tradeService.recomputeDailyReturn(date)
    const daily = await prisma.dailyReturn.findUnique({ where: { date } })
    if (!daily) throw notFound('Daily return day not found.')

    const priorBlocking = await prisma.dailyReturnRun.findFirst({
      where: {
        date,
        returnBasis: basis,
        NOT: existing ? { id: existing.id } : undefined,
      },
    })
    if (priorBlocking && !body.preview) {
      if (priorBlocking.status === 'COMPLETED') {
        throw conflict("Today's return has already been published.")
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
        OR: [
          { investedAmount: { gt: 0 } },
          { availableBalance: { gt: 0 } },
          { lockedBalance: { gt: 0 } },
        ],
        user: {
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          role: 'USER',
          deletedAt: null,
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    const eligible = wallets
      .map((w) => {
        const base = activeInvestment(w, basis)
        return { wallet: w, user: w.user, base }
      })
      .filter((row) => row.base.gt(0))

    let totalBase = d(0)
    let totalGross = d(0)
    const lines = eligible.map((row) => {
      const gross = row.base.mul(returnPct).div(100)
      // Banker's rounding to cents for wallet credits
      const amount = gross.toDecimalPlaces(2)
      totalBase = totalBase.plus(row.base)
      totalGross = totalGross.plus(amount.gt(0) ? amount : d(0))
      return { ...row, gross, amount }
    })
    const roundingDelta = lines
      .reduce((acc, l) => acc.plus(l.gross.minus(l.amount)), d(0))
      .toDecimalPlaces(8)

    logger.info(
      {
        date: dateLabel,
        eligibleWallets: lines.length,
        totalBase: moneyDisplay(totalBase),
        totalGross: moneyDisplay(totalGross),
      },
      'Settlement eligibility computed',
    )

    if (body.preview) {
      return {
        id: 'preview',
        date: dateLabel,
        returnPct: returnPct.toFixed(6),
        returnBasis: basis,
        status: 'PENDING' as const,
        eligibleWallets: lines.length,
        processedWallets: 0,
        successfulWallets: 0,
        failedWallets: 0,
        totalBaseAmount: moneyDisplay(totalBase),
        totalDistributed: moneyDisplay(totalGross),
        roundingDelta: moneyDisplay(roundingDelta),
        notes: body.notes ?? null,
        appliedBy: null,
        startedAt: null,
        completedAt: null,
        durationMs: null,
      }
    }

    if (lines.length === 0) {
      logger.warn({ date: dateLabel }, 'Settlement has zero eligible wallets')
    }

    let run: DailyReturnRun
    try {
      if (existing && (existing.status === 'FAILED' || existing.status === 'PROCESSING')) {
        run = await prisma.dailyReturnRun.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            completedAt: null,
            startedAt: existing.startedAt ?? new Date(),
            eligibleWallets: lines.length,
            totalBaseAmount: moneyString(totalBase),
            roundingDelta: moneyString(roundingDelta),
            returnPct: returnPct.toFixed(6),
            notes: body.notes?.trim() || existing.notes,
            successfulWallets: 0,
            failedWallets: 0,
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
            successfulWallets: 0,
            failedWallets: 0,
            totalBaseAmount: moneyString(totalBase),
            totalDistributed: moneyString(0),
            roundingDelta: moneyString(roundingDelta),
            notes: body.notes?.trim() || null,
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
        throw conflict("Today's return has already been published.")
      }
      throw err
    }

    const alreadyPaid = await prisma.profitDistribution.findMany({
      where: { runId: run.id },
      select: { idempotencyKey: true, amount: true },
    })
    const paidKeys = new Set(alreadyPaid.map((row) => row.idempotencyKey))
    let processed = alreadyPaid.length
    let successful = alreadyPaid.filter((row) => d(row.amount).gt(0)).length
    let failed = 0
    let distributed = alreadyPaid.reduce((acc, row) => {
      const amt = d(row.amount)
      return amt.gt(0) ? acc.plus(amt) : acc
    }, d(0))
    const failures: Array<{ userId: string; error: string }> = []

    const startedAt = run.startedAt ?? new Date()

    for (const line of lines) {
      const idempotencyKey = `run:${run.id}:wallet:${line.wallet.id}`
      if (paidKeys.has(idempotencyKey)) {
        continue
      }

      const userId = line.wallet.userId
      logger.info(
        {
          runId: run.id,
          userId,
          walletId: line.wallet.id,
          base: moneyDisplay(line.base),
          gross: moneyDisplay(line.gross),
          amount: moneyDisplay(line.amount),
        },
        'Processing User',
      )

      try {
        if (!line.amount.gt(0) && !line.amount.lt(0)) {
          // Rounded to zero — skip credit but do not count as failure
          logger.info({ userId, amount: '0.00' }, 'Profit Calculated — skipped (rounds to zero)')
          processed += 1
          continue
        }

        logger.info(
          {
            userId,
            investment: moneyDisplay(line.base),
            returnPct: returnPct.toFixed(6),
            profit: moneyDisplay(line.amount),
          },
          'Profit Calculated',
        )

        const openingAvailable = d(line.wallet.availableBalance)
        let balanceAfter = openingAvailable
        let ledgerTxnId: string | null = null

        await prisma.$transaction(async (tx) => {
          if (line.amount.gt(0)) {
            await ledgerService.ensureWalletsForUser(userId, tx)
            const txn = await ledgerService.creditAvailable(tx, {
              userId,
              walletId: line.wallet.id,
              amount: line.amount,
              entryType: 'PROFIT_DISTRIBUTION',
              transactionType: 'PROFIT',
              description: `Daily Profit ${dateLabel} @ ${returnPct.toFixed(2)}%`,
              referenceType: 'DAILY_RETURN_RUN',
              referenceId: run.id,
              createdById: actorId,
              idempotencyKey,
              bumpProfit: true,
            })
            const inv = await tx.wallet.findUniqueOrThrow({ where: { id: line.wallet.id } })
            ledgerTxnId = txn.id
            balanceAfter = d(inv.availableBalance)
            logger.info(
              {
                userId,
                walletId: line.wallet.id,
                availableBalance: moneyDisplay(balanceAfter),
                totalProfit: moneyDisplay(inv.totalProfit),
                ledgerTxnId,
              },
              'Wallet Updated',
            )
          } else {
            // Negative day: record only — do not force ledger debit (capital protection)
            balanceAfter = openingAvailable
          }

          const existingDist = await tx.profitDistribution.findUnique({
            where: { idempotencyKey },
          })
          if (!existingDist) {
            await tx.profitDistribution.create({
              data: {
                runId: run.id,
                userId,
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
            logger.info({ userId, runId: run.id }, 'History Created')
          }
        })

        await activityService.record({
          userId,
          actorId,
          kind: 'DAILY_RETURN_APPLIED',
          title: `Daily return +${returnPct.toFixed(2)}%`,
          description: `Investment ${moneyDisplay(line.base)} · Profit ${moneyDisplay(line.amount)} · Balance ${moneyDisplay(balanceAfter)}`,
          metadata: {
            runId: run.id,
            date: dateLabel,
            returnPct: returnPct.toFixed(6),
            investment: moneyDisplay(line.base),
            profit: moneyDisplay(line.amount),
            balanceAfter: moneyDisplay(balanceAfter),
          },
          ip: context.ip,
          userAgent: context.userAgent,
        })

        await notificationService.notify({
          userId,
          kind: 'TRADING',
          type: line.amount.gte(0) ? 'DAILY_PROFIT' : 'DAILY_LOSS',
          title: line.amount.gte(0) ? 'Daily profit credited' : 'Daily loss recorded',
          body: `Today's trading return ${returnPct.gte(0) ? '+' : ''}${returnPct.toFixed(2)}%. You ${line.amount.gte(0) ? 'earned' : 'recorded'} $${moneyDisplay(line.amount.abs())}.`,
          actionUrl: '/dashboard',
          metadata: {
            type: line.amount.gte(0) ? 'DAILY_PROFIT' : 'DAILY_LOSS',
            runId: run.id,
            amount: moneyDisplay(line.amount),
            returnPct: returnPct.toFixed(2),
          },
        })
        logger.info({ userId }, 'Notification Sent')

        await transactionalMailer.dailyReturn(userId, {
          date: dateLabel,
          returnPct: returnPct.toFixed(2),
          profit: moneyDisplay(line.amount),
          investment: moneyDisplay(line.base),
          openingBalance: moneyDisplay(openingAvailable),
          closingBalance: moneyDisplay(balanceAfter),
          reference: run.id,
        })
        logger.info({ userId }, 'Email Sent')

        processed += 1
        if (line.amount.gt(0)) {
          successful += 1
          distributed = distributed.plus(line.amount)
        } else {
          successful += 1
        }
      } catch (err) {
        failed += 1
        processed += 1
        const message = err instanceof Error ? err.message : 'Unknown settlement error'
        failures.push({ userId, error: message })
        logger.error({ err, userId, runId: run.id }, 'Settlement user failed — continuing')
      }

      await prisma.dailyReturnRun.update({
        where: { id: run.id },
        data: {
          processedWallets: processed,
          successfulWallets: successful,
          failedWallets: failed,
          totalDistributed: moneyString(distributed),
        },
      })
    }

    const completedAt = new Date()
    const completed = await prisma.dailyReturnRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        processedWallets: processed,
        successfulWallets: successful,
        failedWallets: failed,
        totalDistributed: moneyString(distributed),
        completedAt,
      },
    })

    await prisma.dailyReturn.update({
      where: { id: daily.id },
      data: {
        status: 'DISTRIBUTED',
        netReturnPct: returnPct.toFixed(6),
      },
    })

    const durationMs = completedAt.getTime() - startedAt.getTime()

    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'DISTRIBUTION_COMPLETE',
      title: `Daily return applied ${dateLabel}`,
      description: `${moneyDisplay(distributed)} across ${successful} wallets (${failed} failed)`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId,
      action: 'returns.publish',
      module: 'trading',
      newValue: {
        runId: run.id,
        date: dateLabel,
        returnPct: returnPct.toFixed(6),
        distributed: moneyDisplay(distributed),
        successful,
        failed,
        failures: failures.slice(0, 50),
        durationMs,
      },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await opsAlertService.notify({
      event: 'ROI_DISTRIBUTED',
      title: 'Daily ROI distribution completed',
      action: `Distributed ${moneyDisplay(distributed)} across ${successful} wallets`,
      amount: moneyDisplay(distributed),
      reference: run.id,
      ip: context.ip,
      adminPath: `/admin/daily-return`,
      details: {
        Date: dateLabel,
        'Return %': returnPct.toFixed(4),
        Successful: String(successful),
        Failed: String(failed),
      },
    })

    await transactionalMailer.dailySettlementOwner({
      date: dateLabel,
      returnPct: returnPct.toFixed(2),
      eligibleUsers: lines.length,
      successfulUsers: successful,
      failedUsers: failed,
      totalDistributed: moneyDisplay(distributed),
      durationMs,
      reference: run.id,
      failures: failures.slice(0, 20),
    })

    try {
      const { performanceService } = await import('./performance.service.js')
      await performanceService.snapshotAllForDate(date)
      await performanceService.recalculateGlobal()
    } catch (err) {
      logger.warn({ err, runId: run.id }, 'Performance refresh after settlement failed')
    }

    logger.info(
      {
        runId: run.id,
        date: dateLabel,
        successful,
        failed,
        totalDistributed: moneyDisplay(distributed),
        durationMs,
      },
      'Settlement Completed',
    )

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { firstName: true, lastName: true, email: true },
    })
    const appliedBy = actor
      ? `${actor.firstName} ${actor.lastName}`.trim() || actor.email
      : null

    return mapDailyReturnRun(completed, { appliedBy })
  },
}
