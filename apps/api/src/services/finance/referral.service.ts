import type { Deposit, Prisma, ReferralReward, TransactionHistory } from '@prisma/client'

import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js'
import { assertNonNegative, d, moneyDisplay, moneyString } from '../../utils/money.js'
import { ledgerService } from '../finance/ledger.service.js'
import { settingsService } from '../settings.service.js'
import { realInvestorUser } from '../demo-investor.js'

type TxClient = Prisma.TransactionClient

export type ApprovedDepositForReferral = {
  id: string
  userId: string
  status: Deposit['status']
  amount: Deposit['amount'] | string
  creditedAmount: Deposit['creditedAmount'] | string | null
  reference: string
  reviewedAt: Date | null
}

function computeUnlockAt(approvedAt: Date, unlockDays: number): Date {
  const days = Number.isFinite(unlockDays) && unlockDays > 0 ? Math.floor(unlockDays) : 30
  const at = new Date(approvedAt.getTime())
  at.setUTCDate(at.getUTCDate() + days)
  return at
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

function mapReward(row: ReferralReward & { sourceDeposit?: { reference: string } | null }) {
  return {
    id: row.id,
    sourceDepositId: row.sourceDepositId,
    sourceDepositReference: row.sourceDeposit?.reference ?? null,
    sourceAmount: moneyDisplay(row.sourceAmount),
    rewardAmount: moneyDisplay(row.rewardAmount),
    percentApplied: d(row.percentApplied).toFixed(4),
    status: row.status,
    unlockAt: row.unlockAt.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function isHistoricalReferralMeta(metadata: unknown): metadata is {
  historical?: boolean
  redeemed?: boolean
  redeemedAt?: string
} {
  return Boolean(metadata && typeof metadata === 'object' && (metadata as { historical?: boolean }).historical)
}

function isHistoricalReferralRow(row: Pick<TransactionHistory, 'event' | 'metadata'>) {
  if (row.event === 'HISTORICAL_REFERRAL') return true
  return isHistoricalReferralMeta(row.metadata)
}

async function historicalReferralRows(userId: string) {
  return prisma.transactionHistory.findMany({
    where: {
      userId,
      OR: [
        { event: 'HISTORICAL_REFERRAL' },
        { event: 'REFERRAL_BONUS', metadata: { path: ['historical'], equals: true } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
}

function historicalReferralLabel(message: string | null | undefined, index: number) {
  const from = message?.match(/Referral from\s+(.+?)(?:\.|$)/i)
  if (from?.[1]?.trim()) return from[1].trim().slice(0, 80)
  return `Imported referral ${index + 1}`
}

function historicalReferralBreakdown(rows: TransactionHistory[]) {
  let available = d(0)
  let redeemed = d(0)
  for (const row of rows) {
    if (!isHistoricalReferralRow(row)) continue
    const amt = d(row.amount ?? 0)
    if (!amt.isFinite() || amt.lte(0)) continue
    const meta = isHistoricalReferralMeta(row.metadata) ? row.metadata : null
    if (meta?.redeemed === true) redeemed = redeemed.plus(amt)
    else available = available.plus(amt)
  }
  return { available, redeemed }
}

async function historicalReferralAvailable(userId: string, outstandingRewards: ReturnType<typeof d>) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId_kind: { userId, kind: 'REFERRAL' } },
    select: { availableBalance: true },
  })
  const extra = d(wallet?.availableBalance ?? 0).minus(outstandingRewards)
  return extra.gt(0) ? extra : d(0)
}

async function overlayHistoricalReferralTotals(
  userId: string,
  totals: {
    locked: ReturnType<typeof d>
    available: ReturnType<typeof d>
    redeemed: ReturnType<typeof d>
    total: ReturnType<typeof d>
  },
) {
  const rows = await historicalReferralRows(userId)
  const hist = historicalReferralBreakdown(rows)
  const next = {
    locked: totals.locked,
    available: totals.available.plus(hist.available),
    redeemed: totals.redeemed.plus(hist.redeemed),
    total: totals.total.plus(hist.available).plus(hist.redeemed),
  }
  const leftover = await historicalReferralAvailable(userId, next.locked.plus(next.available))
  next.available = next.available.plus(leftover)
  next.total = next.total.plus(leftover)
  return { ...next, rows }
}

/** Privacy-safe public label for a referred user (no email/phone/id). */
export function privacySafeDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const first = (firstName ?? '').trim()
  const last = (lastName ?? '').trim()
  const combined = `${first} ${last}`.trim()
  if (!combined) return 'User'
  // Avoid leaking single-character noise; still never expose contact fields.
  return combined.slice(0, 80)
}

export const referralService = {
  /**
   * Create a LOCKED referral reward after a deposit is approved and credited.
   * Idempotent on sourceDepositId + ledger key `referral-reward:deposit:{depositId}`.
   */
  async createForApprovedDeposit(
    tx: TxClient,
    deposit: ApprovedDepositForReferral,
  ): Promise<ReferralReward | null> {
    if (deposit.status !== 'APPROVED') return null

    const existing = await tx.referralReward.findUnique({
      where: { sourceDepositId: deposit.id },
    })
    if (existing) {
      await this.ensureRewardCredited(tx, existing)
      return existing
    }

    const sourceAmount = d(deposit.creditedAmount ?? deposit.amount)
    assertNonNegative(sourceAmount, 'Source amount')
    if (!sourceAmount.isFinite() || sourceAmount.lte(0)) return null

    const referee = await tx.user.findUnique({
      where: { id: deposit.userId },
      select: { id: true, referredById: true, deletedAt: true },
    })
    if (!referee || referee.deletedAt) return null
    if (!referee.referredById) return null
    if (referee.referredById === referee.id) return null

    const referrer = await tx.user.findUnique({
      where: { id: referee.referredById },
      select: { id: true, deletedAt: true },
    })
    if (!referrer || referrer.deletedAt) return null
    if (referrer.id === deposit.userId) return null

    let settings = await tx.platformSetting.findFirst()
    if (!settings) {
      const seeded = await settingsService.getOrInitPlatformSettings()
      settings = await tx.platformSetting.findUnique({ where: { id: seeded.id } })
    }
    if (!settings) return null

    if (!settings.referralEnabled) return null

    const percent = d(settings.referralPercent)
    if (!percent.isFinite() || percent.lte(0)) return null

    const rewardAmount = sourceAmount.mul(percent).div(100).toDecimalPlaces(8)
    assertNonNegative(rewardAmount, 'Reward amount')
    if (rewardAmount.lte(0)) return null

    const approvedAt = deposit.reviewedAt ?? new Date()
    const unlockAt = computeUnlockAt(approvedAt, settings.referralUnlockDays)

    let reward: ReferralReward
    try {
      reward = await tx.referralReward.create({
        data: {
          referrerId: referrer.id,
          refereeId: deposit.userId,
          sourceDepositId: deposit.id,
          sourceAmount: moneyString(sourceAmount),
          rewardAmount: moneyString(rewardAmount),
          percentApplied: percent.toFixed(4),
          status: 'LOCKED',
          unlockAt,
        },
      })
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const raced = await tx.referralReward.findUnique({
        where: { sourceDepositId: deposit.id },
      })
      if (!raced) throw err
      await this.ensureRewardCredited(tx, raced)
      return raced
    }

    await this.ensureRewardCredited(tx, reward)
    return tx.referralReward.findUniqueOrThrow({ where: { id: reward.id } })
  },

  /** Credit REFERRAL wallet once per reward (ledger idempotent). */
  async ensureRewardCredited(tx: TxClient, reward: ReferralReward): Promise<void> {
    if (reward.creditedTransactionId) return

    const amount = d(reward.rewardAmount)
    if (!amount.isFinite() || amount.lte(0)) return

    const referralWallet = await ledgerService.getReferralWallet(reward.referrerId, tx)
    const txn = await ledgerService.creditAvailable(tx, {
      userId: reward.referrerId,
      walletId: referralWallet.id,
      amount,
      entryType: 'BONUS',
      transactionType: 'REFERRAL_BONUS',
      description: `Referral reward for deposit ${reward.sourceDepositId}`,
      referenceType: 'REFERRAL_REWARD',
      referenceId: reward.id,
      idempotencyKey: `referral-reward:deposit:${reward.sourceDepositId}`,
    })

    if (!reward.creditedTransactionId) {
      await tx.referralReward.update({
        where: { id: reward.id },
        data: { creditedTransactionId: txn.id },
      })
    }
  },

  /**
   * Idempotent LOCKED → AVAILABLE when now >= unlockAt.
   * Does not touch INVESTMENT wallet.
   */
  async unlockEligibleRewards(
    client: TxClient | typeof prisma = prisma,
    opts?: { referrerId?: string; rewardId?: string },
  ): Promise<number> {
    const now = new Date()
    const due = await client.referralReward.findMany({
      where: {
        status: 'LOCKED',
        unlockAt: { lte: now },
        ...(opts?.referrerId ? { referrerId: opts.referrerId } : {}),
        ...(opts?.rewardId ? { id: opts.rewardId } : {}),
      },
      select: { id: true },
      take: 200,
    })
    if (due.length === 0) return 0

    const result = await client.referralReward.updateMany({
      where: {
        id: { in: due.map((r) => r.id) },
        status: 'LOCKED',
      },
      data: { status: 'AVAILABLE' },
    })

    if (result.count > 0 && client === prisma) {
      void import('./referral-notification.service.js').then(({ referralNotificationService }) => {
        for (const row of due) {
          void referralNotificationService.onRewardAvailable(row.id)
        }
      })
    }
    return result.count
  },

  async summary(userId: string) {
    await this.unlockEligibleRewards(prisma, { referrerId: userId })

    const [user, settings, rewards] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { referralCode: true },
      }),
      settingsService.getOrInitPlatformSettings(),
      prisma.referralReward.findMany({
        where: { referrerId: userId, status: { not: 'CANCELLED' } },
        select: { status: true, rewardAmount: true },
      }),
    ])

    let locked = d(0)
    let available = d(0)
    let redeemed = d(0)
    let total = d(0)
    for (const row of rewards) {
      const amt = d(row.rewardAmount)
      total = total.plus(amt)
      if (row.status === 'LOCKED') locked = locked.plus(amt)
      else if (row.status === 'AVAILABLE') available = available.plus(amt)
      else if (row.status === 'REDEEMED') redeemed = redeemed.plus(amt)
    }
    const overlaid = await overlayHistoricalReferralTotals(userId, { locked, available, redeemed, total })

    const approvedCount = await prisma.deposit.count({
      where: { userId, status: 'APPROVED' },
    })
    const referralEligible = approvedCount > 0
    const code = user.referralCode
    const referralLink =
      code && referralEligible
        ? `${env.APP_URL.replace(/\/$/, '')}/register?ref=${encodeURIComponent(code)}`
        : null

    return {
      referralEnabled: settings.referralEnabled,
      referralEligible,
      referralCode: referralEligible ? code : null,
      referralLink,
      referralPercent: d(settings.referralPercent).toFixed(4),
      referralUnlockDays: settings.referralUnlockDays,
      totalReferralEarned: moneyDisplay(overlaid.total),
      lockedReferral: moneyDisplay(overlaid.locked),
      availableReferral: moneyDisplay(overlaid.available),
      redeemedReferral: moneyDisplay(overlaid.redeemed),
    }
  },

  /**
   * Direct referral network for the authenticated investor.
   * Caller MUST pass session userId only — never a client-supplied user id.
   * Direct referrals only (referredById = userId). No multi-level tree.
   */
  async network(userId: string) {
    await this.unlockEligibleRewards(prisma, { referrerId: userId })

    const [directReferrals, rewards] = await Promise.all([
      prisma.user.findMany({
        where: { referredById: userId, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          deposits: {
            where: { status: 'APPROVED' },
            select: { amount: true, creditedAmount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.referralReward.findMany({
        where: { referrerId: userId, status: { not: 'CANCELLED' } },
        select: { refereeId: true, rewardAmount: true, status: true },
      }),
    ])

    let locked = d(0)
    let available = d(0)
    let redeemed = d(0)
    let total = d(0)
    const earningsByReferee = new Map<string, ReturnType<typeof d>>()

    for (const row of rewards) {
      const amt = d(row.rewardAmount)
      total = total.plus(amt)
      if (row.status === 'LOCKED') locked = locked.plus(amt)
      else if (row.status === 'AVAILABLE') available = available.plus(amt)
      else if (row.status === 'REDEEMED') redeemed = redeemed.plus(amt)

      const prev = earningsByReferee.get(row.refereeId) ?? d(0)
      earningsByReferee.set(row.refereeId, prev.plus(amt))
    }
    const overlaid = await overlayHistoricalReferralTotals(userId, { locked, available, redeemed, total })

    let activeReferrals = 0
    const referrals = directReferrals.map((row) => {
      let deposited = d(0)
      for (const dep of row.deposits) {
        deposited = deposited.plus(d(dep.creditedAmount ?? dep.amount))
      }
      const isActive = row.deposits.length > 0
      if (isActive) activeReferrals += 1

      return {
        displayName: privacySafeDisplayName(row.firstName, row.lastName),
        joinedAt: row.createdAt.toISOString(),
        status: isActive ? ('ACTIVE' as const) : ('NOT_FUNDED' as const),
        approvedDepositAmount: moneyDisplay(deposited),
        referralEarnings: moneyDisplay(earningsByReferee.get(row.id) ?? d(0)),
      }
    })

    const historicalPeople = overlaid.rows
      .filter((row) => isHistoricalReferralRow(row))
      .map((row, index) => ({
        displayName: historicalReferralLabel(row.message, index),
        joinedAt: row.createdAt.toISOString(),
        status: 'ACTIVE' as const,
        approvedDepositAmount: moneyDisplay(0),
        referralEarnings: moneyDisplay(row.amount ?? 0),
      }))

    return {
      totalReferrals: directReferrals.length + historicalPeople.length,
      activeReferrals: activeReferrals + historicalPeople.length,
      totalEarnings: moneyDisplay(overlaid.total),
      lockedEarnings: moneyDisplay(overlaid.locked),
      availableEarnings: moneyDisplay(overlaid.available),
      redeemedEarnings: moneyDisplay(overlaid.redeemed),
      referrals: [...referrals, ...historicalPeople],
    }
  },

  async listRewards(
    userId: string,
    query: { cursor?: string; limit?: number },
  ) {
    await this.unlockEligibleRewards(prisma, { referrerId: userId })
    const limit = Math.min(query.limit ?? 20, 100)
    const items = await prisma.referralReward.findMany({
      where: { referrerId: userId },
      include: { sourceDeposit: { select: { reference: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
    const mapped = items.map(mapReward)
    if (!query.cursor) {
      const historicalRows = await prisma.transactionHistory.findMany({
        where: {
          userId,
          OR: [
            { event: 'HISTORICAL_REFERRAL' },
            { event: 'REFERRAL_BONUS', metadata: { path: ['historical'], equals: true } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      const historicalItems = historicalRows
        .filter((row) => isHistoricalReferralRow(row))
        .map((row) => {
          const meta = isHistoricalReferralMeta(row.metadata) ? row.metadata : null
          const redeemed = meta?.redeemed === true
          return {
            id: row.id,
            sourceDepositId: row.id,
            sourceDepositReference: 'HISTORICAL',
            sourceAmount: moneyDisplay(row.amount ?? 0),
            rewardAmount: moneyDisplay(row.amount ?? 0),
            percentApplied: '0.0000',
            status: (redeemed ? 'REDEEMED' : 'AVAILABLE') as 'REDEEMED' | 'AVAILABLE',
            unlockAt: row.createdAt.toISOString(),
            redeemedAt: redeemed ? meta?.redeemedAt ?? row.createdAt.toISOString() : null,
            createdAt: row.createdAt.toISOString(),
          }
        })
      mapped.unshift(...historicalItems)
    }
    return {
      items: mapped,
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
    }
  },

  /**
   * Move a historically imported referral credit from the referral wallet into investment.
   */
  async redeemHistoricalCredit(userId: string, row: TransactionHistory) {
    const meta = isHistoricalReferralMeta(row.metadata) ? row.metadata : {}
    if (meta.redeemed === true) {
      const redeemedMeta = row.metadata as { redeemedAt?: string; redeemedTransactionId?: string }
      return {
        id: row.id,
        status: 'REDEEMED' as const,
        rewardAmount: moneyDisplay(row.amount ?? 0),
        redeemedAt: redeemedMeta.redeemedAt ?? row.createdAt.toISOString(),
        redeemedTransactionId: redeemedMeta.redeemedTransactionId ?? null,
        alreadyRedeemed: true,
      }
    }
    const amount = d(row.amount ?? 0)
    if (!amount.isFinite() || amount.lte(0)) {
      throw badRequest('Invalid historical referral amount.')
    }

    return prisma.$transaction(async (tx) => {
      const locked = await tx.transactionHistory.findFirst({
        where: { id: row.id, userId },
      })
      if (!locked) throw notFound('Referral reward not found.')
      const lockedMeta = isHistoricalReferralMeta(locked.metadata) ? locked.metadata : {}
      if (lockedMeta.redeemed === true) {
        const redeemedMeta = locked.metadata as { redeemedAt?: string; redeemedTransactionId?: string }
        return {
          id: locked.id,
          status: 'REDEEMED' as const,
          rewardAmount: moneyDisplay(locked.amount ?? 0),
          redeemedAt: redeemedMeta.redeemedAt ?? locked.createdAt.toISOString(),
          redeemedTransactionId: redeemedMeta.redeemedTransactionId ?? null,
          alreadyRedeemed: true,
        }
      }

      const referralWallet = await ledgerService.getReferralWallet(userId, tx)
      const investmentWallet = await ledgerService.getInvestmentWallet(userId, tx)
      const txn = await ledgerService.transferAvailable(tx, {
        userId,
        fromWalletId: referralWallet.id,
        toWalletId: investmentWallet.id,
        amount,
        description: `Redeem historical referral ${locked.id}`,
        referenceType: 'HISTORICAL_REFERRAL',
        referenceId: locked.id,
        idempotencyKey: `referral-redeem:historical:${locked.id}`,
        transactionType: 'TRANSFER',
        entryType: 'TRANSFER',
        bumpInvestedOnDestination: true,
      })
      const redeemedAt = new Date()
      await tx.transactionHistory.update({
        where: { id: locked.id },
        data: {
          metadata: {
            ...(typeof locked.metadata === 'object' && locked.metadata ? locked.metadata : {}),
            historical: true,
            redeemed: true,
            redeemedAt: redeemedAt.toISOString(),
            redeemedTransactionId: txn.id,
          },
        },
      })
      return {
        id: locked.id,
        status: 'REDEEMED' as const,
        rewardAmount: moneyDisplay(amount),
        redeemedAt: redeemedAt.toISOString(),
        redeemedTransactionId: txn.id,
        alreadyRedeemed: false,
      }
    })
  },

  /**
   * Redeem an AVAILABLE reward: REFERRAL → INVESTMENT transfer (once).
   */
  async redeem(userId: string, rewardId: string) {
    await this.unlockEligibleRewards(prisma, { referrerId: userId, rewardId })

    const historical = await prisma.transactionHistory.findFirst({
      where: {
        id: rewardId,
        userId,
        OR: [
          { event: 'HISTORICAL_REFERRAL' },
          { event: 'REFERRAL_BONUS', metadata: { path: ['historical'], equals: true } },
        ],
      },
    })
    if (historical) {
      return this.redeemHistoricalCredit(userId, historical)
    }

    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM referral_rewards WHERE id = ${rewardId}::uuid FOR UPDATE`

      const reward = await tx.referralReward.findUnique({ where: { id: rewardId } })
      if (!reward) throw notFound('Referral reward not found.')
      if (reward.referrerId !== userId) throw forbidden('You cannot redeem this reward.')

      if (reward.status === 'REDEEMED') {
        return {
          id: reward.id,
          status: reward.status,
          rewardAmount: moneyDisplay(reward.rewardAmount),
          redeemedAt: reward.redeemedAt?.toISOString() ?? null,
          redeemedTransactionId: reward.redeemedTransactionId,
          alreadyRedeemed: true,
        }
      }
      if (reward.status === 'CANCELLED') {
        throw badRequest('This referral reward was cancelled.')
      }
      if (reward.status === 'LOCKED') {
        if (reward.unlockAt.getTime() <= Date.now()) {
          await tx.referralReward.update({
            where: { id: reward.id },
            data: { status: 'AVAILABLE' },
          })
        } else {
          throw badRequest('This referral reward is still locked.')
        }
      }

      let current = await tx.referralReward.findUniqueOrThrow({ where: { id: reward.id } })
      if (current.status === 'LOCKED') {
        throw badRequest('This referral reward is still locked.')
      }
      if (current.status !== 'AVAILABLE') {
        throw conflict('Referral reward could not be redeemed.')
      }

      const amount = d(current.rewardAmount)
      if (!amount.isFinite() || amount.lte(0)) {
        throw badRequest('Invalid reward amount.')
      }

      await this.ensureRewardCredited(tx, current)

      const referralWallet = await ledgerService.getReferralWallet(userId, tx)
      const investmentWallet = await ledgerService.getInvestmentWallet(userId, tx)
      const idempotencyKey = `referral-redeem:reward:${current.id}`

      const txn = await ledgerService.transferAvailable(tx, {
        userId,
        fromWalletId: referralWallet.id,
        toWalletId: investmentWallet.id,
        amount,
        description: `Redeem referral reward ${current.id}`,
        referenceType: 'REFERRAL_REWARD',
        referenceId: current.id,
        idempotencyKey,
        transactionType: 'TRANSFER',
        entryType: 'TRANSFER',
        bumpInvestedOnDestination: true,
      })

      const claimed = await tx.referralReward.updateMany({
        where: {
          id: current.id,
          status: 'AVAILABLE',
          redeemedTransactionId: null,
        },
        data: {
          status: 'REDEEMED',
          redeemedAt: new Date(),
          redeemedTransactionId: txn.id,
        },
      })

      if (claimed.count !== 1) {
        const again = await tx.referralReward.findUniqueOrThrow({ where: { id: current.id } })
        if (again.status === 'REDEEMED' && again.redeemedTransactionId === txn.id) {
          return {
            id: again.id,
            status: again.status,
            rewardAmount: moneyDisplay(again.rewardAmount),
            redeemedAt: again.redeemedAt?.toISOString() ?? null,
            redeemedTransactionId: again.redeemedTransactionId,
            alreadyRedeemed: false,
          }
        }
        if (again.status === 'REDEEMED') {
          return {
            id: again.id,
            status: again.status,
            rewardAmount: moneyDisplay(again.rewardAmount),
            redeemedAt: again.redeemedAt?.toISOString() ?? null,
            redeemedTransactionId: again.redeemedTransactionId,
            alreadyRedeemed: true,
          }
        }
        throw conflict('Referral reward could not be redeemed.')
      }

      const updated = await tx.referralReward.findUniqueOrThrow({ where: { id: current.id } })
      return {
        id: updated.id,
        status: updated.status,
        rewardAmount: moneyDisplay(updated.rewardAmount),
        redeemedAt: updated.redeemedAt?.toISOString() ?? null,
        redeemedTransactionId: updated.redeemedTransactionId,
        alreadyRedeemed: false,
      }
    }).then(async (result) => {
      if (!result.alreadyRedeemed) {
        void import('./referral-notification.service.js').then(({ referralNotificationService }) => {
          void referralNotificationService.onRewardRedeemed(result.id)
        })
      }
      return result
    })
  },

  /** Admin overview metrics — live aggregates only. */
  async adminSummary() {
    await this.unlockEligibleRewards(prisma)

    const settings = await settingsService.getOrInitPlatformSettings()
    const rewards = await prisma.referralReward.findMany({
      select: { status: true, rewardAmount: true },
    })

    let totalAmount = d(0)
    let lockedAmount = d(0)
    let availableAmount = d(0)
    let redeemedAmount = d(0)
    let cancelledCount = 0

    for (const row of rewards) {
      const amt = d(row.rewardAmount)
      if (row.status === 'CANCELLED') {
        cancelledCount += 1
        continue
      }
      totalAmount = totalAmount.plus(amt)
      if (row.status === 'LOCKED') lockedAmount = lockedAmount.plus(amt)
      else if (row.status === 'AVAILABLE') availableAmount = availableAmount.plus(amt)
      else if (row.status === 'REDEEMED') redeemedAmount = redeemedAmount.plus(amt)
    }

    const [relationshipCount, activeReferrerCount, referralDepositCount] = await Promise.all([
      prisma.user.count({ where: { ...realInvestorUser, referredById: { not: null } } }),
      prisma.user.findMany({
        where: { ...realInvestorUser, referredById: { not: null } },
        select: { referredById: true },
        distinct: ['referredById'],
      }),
      prisma.referralReward.count({ where: { status: { not: 'CANCELLED' } } }),
    ])

    return {
      referralEnabled: settings.referralEnabled,
      referralPercent: d(settings.referralPercent).toFixed(4),
      referralUnlockDays: settings.referralUnlockDays,
      rewardCount: rewards.length - cancelledCount,
      totalRewardCount: rewards.length,
      cancelledRewardCount: cancelledCount,
      totalRewardAmount: moneyDisplay(totalAmount),
      lockedAmount: moneyDisplay(lockedAmount),
      availableAmount: moneyDisplay(availableAmount),
      redeemedAmount: moneyDisplay(redeemedAmount),
      relationshipCount,
      referredUserCount: relationshipCount,
      activeReferrerCount: activeReferrerCount.length,
      referralDepositCount,
    }
  },

  async adminListRewards(query: {
    q?: string
    status?: 'LOCKED' | 'AVAILABLE' | 'REDEEMED' | 'CANCELLED'
    from?: Date
    to?: Date
    page: number
    limit: number
  }) {
    await this.unlockEligibleRewards(prisma)

    const q = query.q?.trim()
    const orFilters: Prisma.ReferralRewardWhereInput[] = []
    if (q) {
      orFilters.push(
        { referrer: { email: { contains: q, mode: 'insensitive' } } },
        { referrer: { firstName: { contains: q, mode: 'insensitive' } } },
        { referrer: { lastName: { contains: q, mode: 'insensitive' } } },
        { referrer: { referralCode: { contains: q.toUpperCase(), mode: 'insensitive' } } },
        { referee: { email: { contains: q, mode: 'insensitive' } } },
        { referee: { firstName: { contains: q, mode: 'insensitive' } } },
        { referee: { lastName: { contains: q, mode: 'insensitive' } } },
        { referee: { referralCode: { contains: q.toUpperCase(), mode: 'insensitive' } } },
        { sourceDeposit: { reference: { contains: q.toUpperCase() } } },
      )
      if (/^[0-9a-f-]{36}$/i.test(q)) {
        orFilters.push({ sourceDepositId: q }, { id: q })
      }
    }

    const where: Prisma.ReferralRewardWhereInput = {
      referrer: realInvestorUser,
      referee: realInvestorUser,
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(orFilters.length ? { OR: orFilters } : {}),
    }

    const skip = (query.page - 1) * query.limit
    const [items, total] = await Promise.all([
      prisma.referralReward.findMany({
        where,
        include: {
          referrer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
            },
          },
          referee: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
            },
          },
          sourceDeposit: { select: { id: true, reference: true, amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.referralReward.count({ where }),
    ])

    return {
      items: items.map((row) => ({
        id: row.id,
        status: row.status,
        sourceAmount: moneyDisplay(row.sourceAmount),
        rewardAmount: moneyDisplay(row.rewardAmount),
        percentApplied: d(row.percentApplied).toFixed(4),
        unlockAt: row.unlockAt.toISOString(),
        redeemedAt: row.redeemedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        creditedTransactionId: row.creditedTransactionId,
        redeemedTransactionId: row.redeemedTransactionId,
        sourceDeposit: {
          id: row.sourceDeposit.id,
          reference: row.sourceDeposit.reference,
          amount: moneyDisplay(row.sourceDeposit.amount),
          status: row.sourceDeposit.status,
        },
        referrer: {
          id: row.referrer.id,
          email: row.referrer.email,
          firstName: row.referrer.firstName,
          lastName: row.referrer.lastName,
          referralCode: row.referrer.referralCode,
        },
        referee: {
          id: row.referee.id,
          email: row.referee.email,
          firstName: row.referee.firstName,
          lastName: row.referee.lastName,
          referralCode: row.referee.referralCode,
        },
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: skip + items.length < total,
      },
    }
  },

  async adminGetReward(id: string) {
    await this.unlockEligibleRewards(prisma, { rewardId: id })

    const row = await prisma.referralReward.findUnique({
      where: { id },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            referralCode: true,
          },
        },
        referee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            referralCode: true,
          },
        },
        sourceDeposit: { select: { id: true, reference: true, amount: true, status: true } },
      },
    })
    if (!row) throw notFound('Referral reward not found.')

    return {
      id: row.id,
      status: row.status,
      sourceAmount: moneyDisplay(row.sourceAmount),
      rewardAmount: moneyDisplay(row.rewardAmount),
      percentApplied: d(row.percentApplied).toFixed(4),
      unlockAt: row.unlockAt.toISOString(),
      redeemedAt: row.redeemedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      creditedTransactionId: row.creditedTransactionId,
      redeemedTransactionId: row.redeemedTransactionId,
      sourceDeposit: {
        id: row.sourceDeposit.id,
        reference: row.sourceDeposit.reference,
        amount: moneyDisplay(row.sourceDeposit.amount),
        status: row.sourceDeposit.status,
      },
      referrer: {
        id: row.referrer.id,
        email: row.referrer.email,
        firstName: row.referrer.firstName,
        lastName: row.referrer.lastName,
        referralCode: row.referrer.referralCode,
      },
      referee: {
        id: row.referee.id,
        email: row.referee.email,
        firstName: row.referee.firstName,
        lastName: row.referee.lastName,
        referralCode: row.referee.referralCode,
      },
    }
  },

  async adminListRelationships(query: {
    q?: string
    from?: Date
    to?: Date
    page: number
    limit: number
  }) {
    const q = query.q?.trim()
    const where: Prisma.UserWhereInput = {
      ...realInvestorUser,
      referredById: { not: null },
      referredBy: realInvestorUser,
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { referralCode: { contains: q.toUpperCase(), mode: 'insensitive' } },
              { referredBy: { email: { contains: q, mode: 'insensitive' } } },
              { referredBy: { firstName: { contains: q, mode: 'insensitive' } } },
              { referredBy: { lastName: { contains: q, mode: 'insensitive' } } },
              { referredBy: { referralCode: { contains: q.toUpperCase(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const skip = (query.page - 1) * query.limit
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          referralCode: true,
          createdAt: true,
          deletedAt: true,
          referredBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
              deletedAt: true,
            },
          },
          _count: { select: { deposits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ])

    const refereeIds = items.map((u) => u.id)
    const rewardGroups =
      refereeIds.length === 0
        ? []
        : await prisma.referralReward.groupBy({
            by: ['refereeId'],
            where: {
              refereeId: { in: refereeIds },
              status: { not: 'CANCELLED' },
            },
            _sum: { rewardAmount: true },
            _count: { _all: true },
          })
    const rewardByReferee = new Map(
      rewardGroups.map((g) => [
        g.refereeId,
        {
          totalReward: moneyDisplay(g._sum.rewardAmount ?? 0),
          rewardCount: g._count._all,
        },
      ]),
    )

    return {
      items: items.map((row) => {
        const referrer = row.referredBy
        const status =
          !referrer || referrer.deletedAt || row.deletedAt ? 'INACTIVE' : 'ACTIVE'
        const rewards = rewardByReferee.get(row.id)
        return {
          id: row.id,
          status,
          referredUser: {
            id: row.id,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            referralCode: row.referralCode,
            registeredAt: row.createdAt.toISOString(),
          },
          referrer: referrer
            ? {
                id: referrer.id,
                email: referrer.email,
                firstName: referrer.firstName,
                lastName: referrer.lastName,
                referralCode: referrer.referralCode,
              }
            : null,
          depositCount: row._count.deposits,
          rewardCount: rewards?.rewardCount ?? 0,
          totalGeneratedReward: rewards?.totalReward ?? moneyDisplay(0),
        }
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: skip + items.length < total,
      },
    }
  },
}
