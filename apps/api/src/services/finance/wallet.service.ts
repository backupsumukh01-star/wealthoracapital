import type { Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { notificationRepository } from '../../repositories/notification.repository.js'
import { badRequest, forbidden, notFound } from '../../utils/errors.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { ledgerService } from './ledger.service.js'
import { mapLedgerEntry, mapWalletAggregate } from './finance.mappers.js'

async function requireKycApproved(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } })
  if (!user) throw notFound('User not found.')
  if (user.kycStatus !== 'APPROVED') {
    throw forbidden('KYC approval is required before using the wallet.')
  }
}

export const walletService = {
  async provision(userId: string) {
    return ledgerService.ensureWalletsForUser(userId)
  },

  async get(userId: string) {
    await requireKycApproved(userId)
    const wallets = await ledgerService.ensureWalletsForUser(userId)
    return mapWalletAggregate(wallets)
  },

  async summary(userId: string) {
    const wallet = await this.get(userId)
    const [pendingDeposits, pendingWithdrawals, unreadNotifications] = await Promise.all([
      prisma.deposit.count({
        where: { userId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      }),
      prisma.withdrawal.count({
        where: { userId, status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] } },
      }),
      notificationRepository.unreadCount(userId),
    ])

    const today = new Date().toISOString().slice(0, 10)
    return {
      wallet,
      today: {
        date: today,
        profit: moneyDisplay(0),
        returnPct: '0.00',
        status: 'PENDING' as const,
        tradeCount: 0,
      },
      performance: {
        roiPct: '0.00',
        thisMonthProfit: moneyDisplay(0),
        thisMonthReturnPct: '0.00',
        lastMonthReturnPct: '0.00',
        bestDay: null,
        worstDay: null,
        winRatePct: '0.00',
        activeDays: 0,
        avgDailyReturnPct: '0.00',
      },
      chart: { range: '30d', points: [] as Array<{ date: string; balance: string; profit: string; cumulativeProfit: string }> },
      recentTrades: [] as unknown[],
      pending: { deposits: pendingDeposits, withdrawals: pendingWithdrawals },
      unreadNotifications,
    }
  },

  async transactions(
    userId: string,
    query: { cursor?: string; limit?: number; status?: string; from?: Date; to?: Date; q?: string },
  ) {
    await requireKycApproved(userId)
    await ledgerService.ensureWalletsForUser(userId)
    const limit = Math.min(query.limit ?? 20, 100)

    const where: Prisma.LedgerEntryWhereInput = {
      wallet: { userId },
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
              { description: { contains: query.q, mode: 'insensitive' } },
              { referenceId: query.q },
              { idempotencyKey: { contains: query.q } },
            ],
          }
        : {}),
    }

    const items = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })

    return {
      items: items.map(mapLedgerEntry),
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
    }
  },

  async history(userId: string, query: { cursor?: string; limit?: number }) {
    await requireKycApproved(userId)
    const limit = Math.min(query.limit ?? 20, 100)
    const items = await prisma.transactionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
    return {
      items: items.map((row) => ({
        id: row.id,
        event: row.event,
        status: row.status,
        amount: row.amount ? moneyDisplay(row.amount) : null,
        currency: row.currency,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
      exportReady: true,
    }
  },

  async adminList(query: {
    q?: string
    page: number
    limit: number
  }) {
    const skip = (query.page - 1) * query.limit
    const where: Prisma.WalletWhereInput = {
      kind: 'INVESTMENT',
      ...(query.q
        ? {
            user: {
              OR: [
                { email: { contains: query.q, mode: 'insensitive' } },
                { firstName: { contains: query.q, mode: 'insensitive' } },
                { lastName: { contains: query.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.wallet.count({ where }),
    ])

    return {
      items: rows.map((w) => ({
        user: w.user,
        wallet: mapWalletAggregate([w]),
        investmentWalletId: w.id,
        balance: moneyDisplay(w.balance),
        availableBalance: moneyDisplay(w.availableBalance),
        lockedBalance: moneyDisplay(w.lockedBalance),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  },

  async adminAdjust(
    actorId: string,
    userId: string,
    input: { amount: string; direction: 'CREDIT' | 'DEBIT'; reason: string },
  ) {
    const amount = d(input.amount)
    if (!amount.isFinite() || amount.lte(0)) throw badRequest('Amount must be positive.')
    if (!input.reason?.trim()) throw badRequest('A reason is required for adjustments.')

    return prisma.$transaction(async (tx) => {
      const wallet = await ledgerService.getInvestmentWallet(userId, tx)
      if (input.direction === 'CREDIT') {
        await ledgerService.creditAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount,
          entryType: 'ADJUSTMENT_CREDIT',
          transactionType: 'ADMIN_ADJUSTMENT',
          description: input.reason,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: actorId,
          createdById: actorId,
          idempotencyKey: `adj:${userId}:${Date.now()}:${amount.toString()}`,
        })
      } else {
        await ledgerService.debitAvailable(tx, {
          userId,
          walletId: wallet.id,
          amount,
          description: input.reason,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: actorId,
          createdById: actorId,
          idempotencyKey: `adj-debit:${userId}:${Date.now()}:${amount.toString()}`,
        })
      }
      const wallets = await ledgerService.ensureWalletsForUser(userId, tx)
      return mapWalletAggregate(wallets)
    })
  },
}
