import { prisma } from '../../database/prisma.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { realDepositWhere, realInvestorUser, realWithdrawalWhere } from '../demo-investor.js'
import type { Prisma } from '@prisma/client'

function dayBounds() {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export const financeMetricsService = {
  async dashboard() {
    const { start, end } = dayBounds()

    const [
      depositsToday,
      withdrawalsToday,
      pendingDeposits,
      pendingWithdrawals,
      depositVolume,
      withdrawalVolume,
      walletAgg,
      pendingReviews,
      profitAgg,
    ] = await Promise.all([
      prisma.deposit.aggregate({
        where: realDepositWhere({ createdAt: { gte: start, lt: end }, status: 'APPROVED' }),
        _sum: { creditedAmount: true, amount: true },
        _count: { _all: true },
      }),
      prisma.withdrawal.aggregate({
        where: realWithdrawalWhere({
          paidAt: { gte: start, lt: end },
          status: { in: ['PAID', 'COMPLETED'] },
        }),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.deposit.count({
        where: realDepositWhere({ status: { in: ['PENDING', 'UNDER_REVIEW'] } }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({
          status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] },
        }),
      }),
      prisma.deposit.aggregate({
        where: realDepositWhere({ status: 'APPROVED' }),
        _sum: { creditedAmount: true, amount: true },
      }),
      prisma.withdrawal.aggregate({
        where: realWithdrawalWhere({ status: { in: ['PAID', 'COMPLETED'] } }),
        _sum: { amount: true },
      }),
      prisma.wallet.aggregate({
        where: { kind: 'INVESTMENT', user: realInvestorUser },
        _sum: {
          balance: true,
          availableBalance: true,
          lockedBalance: true,
          pendingBalance: true,
        },
      }),
      prisma.approvalQueue.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.wallet.aggregate({
        where: { kind: 'PROFIT', user: realInvestorUser },
        _sum: { totalProfit: true, balance: true },
      }),
    ])

    const todayDepositAmount = d(
      depositsToday._sum.creditedAmount ?? depositsToday._sum.amount ?? 0,
    )
    const todayWithdrawalAmount = d(withdrawalsToday._sum.amount ?? 0)
    const totalDepositVolume = d(depositVolume._sum.creditedAmount ?? depositVolume._sum.amount ?? 0)
    const totalWithdrawalVolume = d(withdrawalVolume._sum.amount ?? 0)

    return {
      todaysDeposits: {
        count: depositsToday._count._all,
        amount: moneyDisplay(todayDepositAmount),
      },
      todaysWithdrawals: {
        count: withdrawalsToday._count._all,
        amount: moneyDisplay(todayWithdrawalAmount),
      },
      pendingDeposits,
      pendingWithdrawals,
      totalVolume: moneyDisplay(totalDepositVolume.plus(totalWithdrawalVolume)),
      totalProfit: moneyDisplay(profitAgg._sum.totalProfit ?? profitAgg._sum.balance ?? 0),
      walletBalances: {
        balance: moneyDisplay(walletAgg._sum.balance ?? 0),
        available: moneyDisplay(walletAgg._sum.availableBalance ?? 0),
        locked: moneyDisplay(walletAgg._sum.lockedBalance ?? 0),
        pending: moneyDisplay(walletAgg._sum.pendingBalance ?? 0),
      },
      pendingReviews,
    }
  },

  async adminLedger(query: {
    q?: string
    page: number
    limit: number
    from?: Date
    to?: Date
  }) {
    const where: Prisma.LedgerEntryWhereInput = {
      wallet: { user: realInvestorUser },
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { description: { contains: query.q, mode: 'insensitive' as const } },
              { referenceId: query.q },
              { idempotencyKey: { contains: query.q } },
            ],
          }
        : {}),
    }
    const skip = (query.page - 1) * query.limit
    const [items, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          wallet: { select: { userId: true, kind: true } },
          account: { select: { code: true, name: true } },
          transaction: { select: { referenceId: true, type: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ])

    return {
      items: items.map((e) => ({
        id: e.id,
        direction: e.direction,
        amount: moneyDisplay(e.amount),
        signedAmount: moneyDisplay(e.signedAmount),
        entryType: e.entryType,
        description: e.description,
        account: e.account,
        wallet: e.wallet,
        transaction: e.transaction,
        createdAt: e.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  },
}
