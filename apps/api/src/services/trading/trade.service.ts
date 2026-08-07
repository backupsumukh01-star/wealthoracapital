import type { AllocationMode, Prisma, TradeHistoryAction, TradeRisk, TradeStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { prisma } from '../../database/prisma.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { notificationService } from '../notification.service.js'
import { badRequest, forbidden, notFound } from '../../utils/errors.js'
import { d, moneyString } from '../../utils/money.js'
import { mapTrade, suggestedReturnPct } from './trade.mappers.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function tradeRef(): string {
  return `TRD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

async function appendHistory(
  tradeId: string,
  action: TradeHistoryAction,
  actorId: string | null,
  message?: string,
  metadata?: Prisma.InputJsonValue,
) {
  await prisma.tradeHistory.create({
    data: {
      tradeId,
      actorId,
      action,
      message: message ?? null,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  })
}

const SETTLED: TradeStatus[] = ['CLOSED', 'CANCELLED', 'ARCHIVED']

export const tradeService = {
  async listPublic(query: { cursor?: string; outcome?: string; limit?: number }) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100)
    const items = await prisma.trade.findMany({
      where: {
        isPublic: true,
        status: { in: ['OPEN', 'RUNNING', 'CLOSED'] },
        ...(query.outcome ? { outcome: query.outcome as never } : {}),
      },
      orderBy: [{ tradeDate: 'desc' }, { closeTime: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
    return {
      items: items.map(mapTrade),
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
    }
  },

  async listInvestor(query: { cursor?: string; outcome?: string; limit?: number }) {
    return this.listPublic(query)
  },

  async getPublic(id: string) {
    const trade = await prisma.trade.findFirst({
      where: { id, OR: [{ isPublic: true }, { status: { in: ['OPEN', 'RUNNING', 'CLOSED'] } }] },
    })
    if (!trade || (!trade.isPublic && trade.status === 'DRAFT')) {
      throw notFound('Trade not found.')
    }
    return mapTrade(trade)
  },

  async pairs() {
    const rows = await prisma.trade.findMany({
      where: { isPublic: true },
      distinct: ['pair'],
      select: { pair: true },
      orderBy: { pair: 'asc' },
    })
    return rows.map((r) => r.pair)
  },

  async stats() {
    const closed = await prisma.trade.findMany({
      where: { status: 'CLOSED', isPublic: true, returnPct: { not: null } },
      select: { returnPct: true, outcome: true },
    })
    const wins = closed.filter((t) => t.outcome === 'WIN' || (t.returnPct && d(t.returnPct).gt(0))).length
    const sum = closed.reduce((acc, t) => acc.plus(d(t.returnPct ?? 0)), d(0))
    const avg = closed.length ? sum.div(closed.length) : d(0)
    return {
      winRatePct: closed.length ? avg && d(wins).div(closed.length).mul(100).toFixed(2) : '0.00',
      tradeCount: closed.length,
      avgReturnPct: avg.toFixed(6),
    }
  },

  async adminList(query: {
    q?: string
    status?: TradeStatus
    pair?: string
    strategy?: string
    risk?: TradeRisk
    from?: Date
    to?: Date
    page?: number
    limit?: number
  }) {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 50, 100)
    const where: Prisma.TradeWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.pair ? { pair: query.pair } : {}),
      ...(query.strategy ? { strategy: { contains: query.strategy, mode: 'insensitive' } } : {}),
      ...(query.risk ? { risk: query.risk } : {}),
      ...(query.from || query.to
        ? {
            tradeDate: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { reference: { contains: query.q.toUpperCase() } },
              { pair: { contains: query.q, mode: 'insensitive' } },
              { strategy: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: [{ tradeDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ])
    return {
      items: items.map(mapTrade),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async adminGet(id: string) {
    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        allocations: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
        result: true,
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })
    if (!trade) throw notFound('Trade not found.')
    return {
      ...mapTrade(trade),
      allocations: trade.allocations,
      result: trade.result,
      history: trade.history,
    }
  },

  async create(
    actorId: string,
    body: {
      pair: string
      direction: 'BUY' | 'SELL'
      entryPrice: string
      exitPrice?: string
      stopLoss?: string
      takeProfit?: string
      lotSize?: string
      leverage?: string
      strategy?: string
      risk?: TradeRisk
      tradeDate: string
      openTime?: string
      adminNotes?: string
      returnPct?: string
    },
    context: Ctx,
  ) {
    const entry = d(body.entryPrice)
    if (entry.lte(0)) throw badRequest('Entry price must be positive.')
    let returnPct = body.returnPct ? d(body.returnPct) : null
    if (returnPct == null && body.exitPrice) {
      returnPct = suggestedReturnPct(body.direction, entry, d(body.exitPrice))
    }

    const trade = await prisma.trade.create({
      data: {
        reference: tradeRef(),
        pair: body.pair.toUpperCase(),
        direction: body.direction,
        strategy: body.strategy ?? null,
        risk: body.risk ?? 'MEDIUM',
        leverage: body.leverage ? moneyString(d(body.leverage), 2) : null,
        lotSize: body.lotSize ? moneyString(d(body.lotSize)) : null,
        entryPrice: moneyString(entry),
        exitPrice: body.exitPrice ? moneyString(d(body.exitPrice)) : null,
        stopLoss: body.stopLoss ? moneyString(d(body.stopLoss)) : null,
        takeProfit: body.takeProfit ? moneyString(d(body.takeProfit)) : null,
        tradeDate: new Date(body.tradeDate),
        openTime: body.openTime ? new Date(body.openTime) : null,
        adminNotes: body.adminNotes ?? null,
        returnPct: returnPct ? returnPct.toFixed(6) : null,
        status: 'DRAFT',
        createdById: actorId,
      },
    })
    await appendHistory(trade.id, 'CREATED', actorId, 'Trade created')
    await auditService.record({
      actorId,
      action: 'trade.create',
      module: 'trading',
      newValue: { id: trade.id, reference: trade.reference },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    const { opsAlertService } = await import('../ops-alert.service.js')
    await opsAlertService.notify({
      event: 'INVESTMENT_CREATED',
      title: 'Investment / trade created',
      action: `Trade ${trade.reference} created`,
      reference: trade.reference,
      ip: context.ip,
      adminPath: `/admin/trades`,
      details: { Pair: trade.pair, Direction: trade.direction },
    })
    return mapTrade(trade)
  },

  async update(
    actorId: string,
    id: string,
    body: Partial<{
      pair: string
      direction: 'BUY' | 'SELL'
      entryPrice: string
      exitPrice: string
      stopLoss: string | null
      takeProfit: string | null
      lotSize: string | null
      leverage: string | null
      strategy: string | null
      risk: TradeRisk
      tradeDate: string
      adminNotes: string | null
      returnPct: string
    }>,
    context: Ctx,
  ) {
    const existing = await prisma.trade.findUnique({ where: { id } })
    if (!existing) throw notFound('Trade not found.')
    if (existing.settledAt || SETTLED.includes(existing.status)) {
      throw forbidden('Settled trades cannot be edited.')
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: {
        ...(body.pair ? { pair: body.pair.toUpperCase() } : {}),
        ...(body.direction ? { direction: body.direction } : {}),
        ...(body.entryPrice ? { entryPrice: moneyString(d(body.entryPrice)) } : {}),
        ...(body.exitPrice !== undefined
          ? { exitPrice: body.exitPrice ? moneyString(d(body.exitPrice)) : null }
          : {}),
        ...(body.stopLoss !== undefined
          ? { stopLoss: body.stopLoss ? moneyString(d(body.stopLoss)) : null }
          : {}),
        ...(body.takeProfit !== undefined
          ? { takeProfit: body.takeProfit ? moneyString(d(body.takeProfit)) : null }
          : {}),
        ...(body.lotSize !== undefined
          ? { lotSize: body.lotSize ? moneyString(d(body.lotSize)) : null }
          : {}),
        ...(body.leverage !== undefined
          ? { leverage: body.leverage ? moneyString(d(body.leverage), 2) : null }
          : {}),
        ...(body.strategy !== undefined ? { strategy: body.strategy } : {}),
        ...(body.risk ? { risk: body.risk } : {}),
        ...(body.tradeDate ? { tradeDate: new Date(body.tradeDate) } : {}),
        ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
        ...(body.returnPct !== undefined ? { returnPct: d(body.returnPct).toFixed(6) } : {}),
      },
    })
    await appendHistory(trade.id, 'UPDATED', actorId, 'Trade updated')
    await auditService.record({
      actorId,
      action: 'trade.update',
      module: 'trading',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTrade(trade)
  },

  async open(actorId: string, id: string, context: Ctx) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    if (!['DRAFT', 'SCHEDULED'].includes(trade.status)) {
      throw badRequest('Only draft/scheduled trades can be opened.')
    }
    const updated = await prisma.trade.update({
      where: { id },
      data: { status: 'OPEN', openTime: trade.openTime ?? new Date() },
    })
    await appendHistory(id, 'OPENED', actorId, 'Trade opened')
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'TRADE_OPENED',
      title: `Trade opened ${trade.reference}`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId,
      action: 'trade.open',
      module: 'trading',
      newValue: { id, status: 'OPEN' },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    // Notify allocated investors
    const allocations = await prisma.tradeAllocation.findMany({ where: { tradeId: id } })
    await Promise.all(
      allocations.map((a) =>
        notificationService.notify({
          userId: a.userId,
          kind: 'TRADING',
          title: 'Trade opened',
          body: `${trade.pair} ${trade.direction} is now open.`,
          metadata: { type: 'TRADE_OPENED', tradeId: id },
        }),
      ),
    )
    return mapTrade(updated)
  },

  async close(
    actorId: string,
    id: string,
    body: { exitPrice?: string; returnPct?: string; adminNotes?: string },
    context: Ctx,
  ) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    if (!['OPEN', 'RUNNING'].includes(trade.status)) {
      throw badRequest('Only open/running trades can be closed.')
    }
    if (trade.settledAt) throw forbidden('Trade already settled.')

    const exit = body.exitPrice ? d(body.exitPrice) : trade.exitPrice ? d(trade.exitPrice) : null
    if (!exit) throw badRequest('Exit price is required to close a trade.')
    const returnPct = body.returnPct
      ? d(body.returnPct)
      : suggestedReturnPct(trade.direction, trade.entryPrice, exit)
    const outcome = returnPct.gt(0) ? 'WIN' : returnPct.lt(0) ? 'LOSS' : 'BREAKEVEN'

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.trade.update({
        where: { id },
        data: {
          status: 'CLOSED',
          exitPrice: moneyString(exit),
          closeTime: new Date(),
          returnPct: returnPct.toFixed(6),
          outcome,
          profitAmount: returnPct.gt(0) ? moneyString(returnPct.abs()) : moneyString(0),
          lossAmount: returnPct.lt(0) ? moneyString(returnPct.abs()) : moneyString(0),
          settledAt: new Date(),
          adminNotes: body.adminNotes ?? trade.adminNotes,
        },
      })
      await tx.tradeResult.create({
        data: {
          tradeId: id,
          outcome,
          returnPct: returnPct.toFixed(6),
          profitAmount: moneyString(returnPct),
          notes: body.adminNotes ?? null,
        },
      })
      return row
    })

    await appendHistory(id, 'CLOSED', actorId, `Closed @ ${returnPct.toFixed(6)}%`)
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'TRADE_CLOSED',
      title: `Trade closed ${trade.reference}`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId,
      action: 'trade.close',
      module: 'trading',
      newValue: { id, outcome, returnPct: returnPct.toFixed(6) },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    const allocations = await prisma.tradeAllocation.findMany({ where: { tradeId: id } })
    await Promise.all(
      allocations.map((a) =>
        notificationService.notify({
          userId: a.userId,
          kind: 'TRADING',
          title: 'Trade closed',
          body: `${trade.pair} closed with ${returnPct.toFixed(2)}%.`,
          metadata: { type: 'TRADE_CLOSED', tradeId: id },
        }),
      ),
    )

    // Refresh daily return aggregate for the trade date
    await this.recomputeDailyReturn(trade.tradeDate)
    return mapTrade(updated)
  },

  async cancel(actorId: string, id: string, context: Ctx) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    if (SETTLED.includes(trade.status) && trade.status !== 'CANCELLED') {
      throw forbidden('Cannot cancel a settled trade.')
    }
    const updated = await prisma.trade.update({
      where: { id },
      data: { status: 'CANCELLED', settledAt: new Date() },
    })
    await appendHistory(id, 'CANCELLED', actorId, 'Trade cancelled')
    await auditService.record({
      actorId,
      action: 'trade.cancel',
      module: 'trading',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    const { opsAlertService } = await import('../ops-alert.service.js')
    await opsAlertService.notify({
      event: 'INVESTMENT_CANCELLED',
      title: 'Investment / trade cancelled',
      action: `Trade ${trade.reference} cancelled`,
      reference: trade.reference,
      ip: context.ip,
      adminPath: `/admin/trades`,
    })
    return mapTrade(updated)
  },

  async archive(actorId: string, id: string, context: Ctx) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    const updated = await prisma.trade.update({
      where: { id },
      data: { status: 'ARCHIVED', isPublic: false },
    })
    await appendHistory(id, 'ARCHIVED', actorId, 'Trade archived')
    await auditService.record({
      actorId,
      action: 'trade.archive',
      module: 'trading',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTrade(updated)
  },

  async duplicate(actorId: string, id: string, context: Ctx) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    const copy = await prisma.trade.create({
      data: {
        reference: tradeRef(),
        pair: trade.pair,
        direction: trade.direction,
        strategy: trade.strategy,
        risk: trade.risk,
        leverage: trade.leverage,
        lotSize: trade.lotSize,
        entryPrice: trade.entryPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        tradeDate: trade.tradeDate,
        status: 'DRAFT',
        isPublic: false,
        adminNotes: trade.adminNotes,
        createdById: actorId,
      },
    })
    await appendHistory(copy.id, 'DUPLICATED', actorId, `Duplicated from ${trade.reference}`)
    await auditService.record({
      actorId,
      action: 'trade.duplicate',
      module: 'trading',
      newValue: { id: copy.id, from: id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTrade(copy)
  },

  async publish(actorId: string, id: string, context: Ctx) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    const updated = await prisma.trade.update({
      where: { id },
      data: { isPublic: true, status: trade.status === 'DRAFT' ? 'SCHEDULED' : trade.status },
    })
    await appendHistory(id, 'PUBLISHED', actorId, 'Trade published')
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'TRADE_PUBLISHED',
      title: `Trade published ${trade.reference}`,
    })
    await auditService.record({
      actorId,
      action: 'trade.publish',
      module: 'trading',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTrade(updated)
  },

  async hide(actorId: string, id: string, context: Ctx) {
    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) throw notFound('Trade not found.')
    const updated = await prisma.trade.update({
      where: { id },
      data: { isPublic: false },
    })
    await appendHistory(id, 'HIDDEN', actorId, 'Trade hidden')
    await auditService.record({
      actorId,
      action: 'trade.hide',
      module: 'trading',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTrade(updated)
  },

  async allocate(
    actorId: string,
    body: {
      tradeId: string
      mode: AllocationMode
      userIds?: string[]
      allocations?: Array<{ userId: string; amount?: string; pct?: string }>
    },
    context: Ctx,
  ) {
    const trade = await prisma.trade.findUnique({ where: { id: body.tradeId } })
    if (!trade) throw notFound('Trade not found.')
    if (SETTLED.includes(trade.status)) throw forbidden('Cannot allocate a settled trade.')

    const wallets = await prisma.wallet.findMany({
      where: {
        kind: 'INVESTMENT',
        user: { status: 'ACTIVE', kycStatus: 'APPROVED', role: 'USER' },
        ...(body.userIds?.length ? { userId: { in: body.userIds } } : {}),
        availableBalance: { gt: 0 },
      },
      include: { user: { select: { id: true } } },
    })
    if (wallets.length === 0) throw badRequest('No eligible investors for allocation.')

    const totalCapital = wallets.reduce((acc, w) => acc.plus(d(w.availableBalance)), d(0))
    const rows: Array<{ userId: string; amount: ReturnType<typeof d>; pct: ReturnType<typeof d> }> =
      []

    if (body.mode === 'MANUAL') {
      if (!body.allocations?.length) throw badRequest('Manual allocations required.')
      for (const a of body.allocations) {
        const amount = d(a.amount ?? 0)
        if (amount.lte(0)) throw badRequest('Allocation amounts must be positive.')
        rows.push({ userId: a.userId, amount, pct: totalCapital.gt(0) ? amount.div(totalCapital).mul(100) : d(0) })
      }
    } else if (body.mode === 'EQUAL') {
      const each = totalCapital.div(wallets.length)
      for (const w of wallets) {
        rows.push({
          userId: w.userId,
          amount: each,
          pct: d(100).div(wallets.length),
        })
      }
    } else if (body.mode === 'PERCENTAGE') {
      if (!body.allocations?.length) throw badRequest('Percentage allocations required.')
      for (const a of body.allocations) {
        const pct = d(a.pct ?? 0)
        rows.push({
          userId: a.userId,
          pct,
          amount: totalCapital.mul(pct).div(100),
        })
      }
    } else {
      // CAPITAL — proportional to available balance
      for (const w of wallets) {
        const amount = d(w.availableBalance)
        rows.push({
          userId: w.userId,
          amount,
          pct: totalCapital.gt(0) ? amount.div(totalCapital).mul(100) : d(0),
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.tradeAllocation.deleteMany({ where: { tradeId: trade.id } })
      for (const row of rows) {
        await tx.tradeAllocation.create({
          data: {
            tradeId: trade.id,
            userId: row.userId,
            mode: body.mode,
            allocatedAmount: moneyString(row.amount),
            allocationPct: row.pct.toFixed(6),
          },
        })
      }
    })
    await appendHistory(trade.id, 'ALLOCATED', actorId, `Allocated ${rows.length} investors (${body.mode})`)
    await auditService.record({
      actorId,
      action: 'trade.allocate',
      module: 'trading',
      newValue: { tradeId: trade.id, mode: body.mode, count: rows.length },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.adminGet(trade.id)
  },

  async recomputeDailyReturn(date: Date) {
    const dayStart = new Date(date)
    dayStart.setUTCHours(0, 0, 0, 0)
    const trades = await prisma.trade.findMany({
      where: { tradeDate: dayStart, status: 'CLOSED', returnPct: { not: null } },
    })
    const computed = trades.reduce((acc, t) => acc.plus(d(t.returnPct ?? 0)), d(0))
    const winCount = trades.filter((t) => t.outcome === 'WIN').length
    const lossCount = trades.filter((t) => t.outcome === 'LOSS').length
    await prisma.dailyReturn.upsert({
      where: { date: dayStart },
      create: {
        date: dayStart,
        status: 'DRAFT',
        computedReturnPct: computed.toFixed(6),
        netReturnPct: computed.toFixed(6),
        tradeCount: trades.length,
        winCount,
        lossCount,
      },
      update: {
        computedReturnPct: computed.toFixed(6),
        netReturnPct: computed.toFixed(6),
        tradeCount: trades.length,
        winCount,
        lossCount,
      },
    })
  },
}
