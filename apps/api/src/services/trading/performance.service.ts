import { prisma } from '../../database/prisma.js'
import { ledgerService } from '../finance/ledger.service.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { mapTrade } from './trade.mappers.js'

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export const performanceService = {
  async summary(userId?: string) {
    const distWhere = userId
      ? { userId, isReversed: false }
      : { isReversed: false }

    const distributions = await prisma.profitDistribution.findMany({
      where: distWhere,
      orderBy: { date: 'asc' },
    })

    const totalProfit = distributions.reduce((acc, row) => acc.plus(d(row.amount)), d(0))
    const invested = userId
      ? d(
          (
            await prisma.wallet.findUnique({
              where: { userId_kind: { userId, kind: 'INVESTMENT' } },
            })
          )?.investedAmount ?? 0,
        )
      : d(
          (
            await prisma.wallet.aggregate({
              where: { kind: 'INVESTMENT' },
              _sum: { investedAmount: true },
            })
          )._sum.investedAmount ?? 0,
        )

    const roiPct = invested.gt(0) ? totalProfit.div(invested).mul(100) : d(0)

    const byDay = new Map<string, ReturnType<typeof d>>()
    for (const row of distributions) {
      const key = dayKey(row.date)
      byDay.set(key, (byDay.get(key) ?? d(0)).plus(d(row.amount)))
    }
    const dayEntries = [...byDay.entries()]
    let bestDay: { date: string; returnPct: string; profit: string } | null = null
    let worstDay: { date: string; returnPct: string; profit: string } | null = null
    for (const [date, profit] of dayEntries) {
      const point = { date, returnPct: '0.000000', profit: moneyDisplay(profit) }
      if (!bestDay || profit.gt(d(bestDay.profit))) bestDay = point
      if (!worstDay || profit.lt(d(worstDay.profit))) worstDay = point
    }

    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const thisMonthProfit = distributions
      .filter((r) => r.date >= monthStart)
      .reduce((acc, r) => acc.plus(d(r.amount)), d(0))
    const lastMonthProfit = distributions
      .filter((r) => r.date >= lastMonthStart && r.date < monthStart)
      .reduce((acc, r) => acc.plus(d(r.amount)), d(0))

    const closedTrades = await prisma.trade.count({
      where: { status: 'CLOSED', ...(userId ? {} : {}) },
    })
    const wins = await prisma.trade.count({
      where: { status: 'CLOSED', outcome: 'WIN' },
    })

    const avgDaily =
      dayEntries.length > 0
        ? dayEntries
            .reduce((acc, [, p]) => acc.plus(p), d(0))
            .div(dayEntries.length)
        : d(0)

    return {
      roiPct: roiPct.toFixed(6),
      thisMonthProfit: moneyDisplay(thisMonthProfit),
      thisMonthReturnPct: invested.gt(0) ? thisMonthProfit.div(invested).mul(100).toFixed(6) : '0.000000',
      lastMonthReturnPct: invested.gt(0) ? lastMonthProfit.div(invested).mul(100).toFixed(6) : '0.000000',
      bestDay,
      worstDay,
      winRatePct: closedTrades ? d(wins).div(closedTrades).mul(100).toFixed(2) : '0.00',
      activeDays: dayEntries.length,
      avgDailyReturnPct: avgDaily.toFixed(6),
    }
  },

  async series(userId: string | undefined, range: string) {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : range === 'all' ? 3650 : 30
    const from = new Date()
    from.setUTCDate(from.getUTCDate() - days)
    from.setUTCHours(0, 0, 0, 0)

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        ...(userId ? { userId } : {}),
        date: { gte: from },
      },
      orderBy: { date: 'asc' },
    })

    if (snapshots.length > 0 && userId) {
      let cumulative = d(0)
      return {
        range,
        points: snapshots.map((s) => {
          cumulative = cumulative.plus(d(s.dailyProfit))
          return {
            date: dayKey(s.date),
            balance: moneyDisplay(s.balance),
            profit: moneyDisplay(s.dailyProfit),
            cumulativeProfit: moneyDisplay(cumulative),
          }
        }),
      }
    }

    // Fallback from distributions
    const dists = await prisma.profitDistribution.findMany({
      where: {
        ...(userId ? { userId } : {}),
        isReversed: false,
        date: { gte: from },
      },
      orderBy: { date: 'asc' },
    })
    let cumulative = d(0)
    let balance = userId
      ? d(
          (
            await prisma.wallet.findUnique({
              where: { userId_kind: { userId, kind: 'INVESTMENT' } },
            })
          )?.balance ?? 0,
        )
      : d(0)

    const byDay = new Map<string, ReturnType<typeof d>>()
    for (const row of dists) {
      const key = dayKey(row.date)
      byDay.set(key, (byDay.get(key) ?? d(0)).plus(d(row.amount)))
    }
    const points = [...byDay.entries()].map(([date, profit]) => {
      cumulative = cumulative.plus(profit)
      return {
        date,
        balance: moneyDisplay(balance),
        profit: moneyDisplay(profit),
        cumulativeProfit: moneyDisplay(cumulative),
      }
    })
    return { range, points }
  },

  async monthly(userId?: string) {
    const dists = await prisma.profitDistribution.findMany({
      where: { ...(userId ? { userId } : {}), isReversed: false },
    })
    const map = new Map<string, ReturnType<typeof d>>()
    for (const row of dists) {
      const key = dayKey(row.date).slice(0, 7)
      map.set(key, (map.get(key) ?? d(0)).plus(d(row.amount)))
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, profit]) => ({
        month,
        returnPct: '0.000000',
        profit: moneyDisplay(profit),
      }))
  },

  async yearly(userId?: string) {
    const monthly = await this.monthly(userId)
    const map = new Map<string, ReturnType<typeof d>>()
    for (const row of monthly) {
      const year = row.month.slice(0, 4)
      map.set(year, (map.get(year) ?? d(0)).plus(d(row.profit)))
    }
    return [...map.entries()].map(([year, profit]) => ({
      year,
      returnPct: '0.000000',
      profit: moneyDisplay(profit),
    }))
  },

  async portfolio(userId: string) {
    const wallets = await ledgerService.ensureWalletsForUser(userId)
    const investment = wallets.find((w) => w.kind === 'INVESTMENT')
    const summary = await this.summary(userId)
    const todayKey = dayKey(new Date())
    const todayDist = await prisma.profitDistribution.aggregate({
      where: { userId, date: dayDate(todayKey), isReversed: false },
      _sum: { amount: true },
    })
    const weekAgo = new Date()
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
    const weekProfit = await prisma.profitDistribution.aggregate({
      where: { userId, date: { gte: weekAgo }, isReversed: false },
      _sum: { amount: true },
    })
    const monthAgo = new Date()
    monthAgo.setUTCDate(1)
    monthAgo.setUTCHours(0, 0, 0, 0)
    const monthProfit = await prisma.profitDistribution.aggregate({
      where: { userId, date: { gte: monthAgo }, isReversed: false },
      _sum: { amount: true },
    })

    const balance = wallets.reduce((acc, w) => acc.plus(d(w.balance)), d(0))
    return {
      currentBalance: moneyDisplay(balance),
      dailyProfit: moneyDisplay(todayDist._sum.amount ?? 0),
      weeklyProfit: moneyDisplay(weekProfit._sum.amount ?? 0),
      monthlyProfit: moneyDisplay(monthProfit._sum.amount ?? 0),
      totalRoi: summary.roiPct,
      portfolioValue: moneyDisplay(balance),
      performancePct: summary.roiPct,
      investedAmount: moneyDisplay(investment?.investedAmount ?? 0),
      availableBalance: moneyDisplay(
        wallets.reduce((acc, w) => acc.plus(d(w.availableBalance)), d(0)),
      ),
    }
  },

  async analytics() {
    const closed = await prisma.trade.findMany({
      where: { status: 'CLOSED', returnPct: { not: null } },
    })
    const wins = closed.filter((t) => t.outcome === 'WIN').length
    const losses = closed.filter((t) => t.outcome === 'LOSS').length
    const sum = closed.reduce((acc, t) => acc.plus(d(t.returnPct ?? 0)), d(0))
    const avg = closed.length ? sum.div(closed.length) : d(0)
    let best = closed[0]
    let worst = closed[0]
    for (const t of closed) {
      if (best && d(t.returnPct ?? 0).gt(d(best.returnPct ?? 0))) best = t
      if (worst && d(t.returnPct ?? 0).lt(d(worst.returnPct ?? 0))) worst = t
    }
    const totalPnl = await prisma.profitDistribution.aggregate({
      where: { isReversed: false },
      _sum: { amount: true },
    })
    return {
      winRate: closed.length ? d(wins).div(closed.length).mul(100).toFixed(2) : '0.00',
      lossRate: closed.length ? d(losses).div(closed.length).mul(100).toFixed(2) : '0.00',
      averageTrade: avg.toFixed(6),
      bestTrade: best ? mapTrade(best) : null,
      worstTrade: worst ? mapTrade(worst) : null,
      totalPnl: moneyDisplay(totalPnl._sum.amount ?? 0),
      roi: (await this.summary()).roiPct,
      openTrades: await prisma.trade.count({ where: { status: { in: ['OPEN', 'RUNNING'] } } }),
      closedTrades: closed.length,
    }
  },

  async snapshotAllForDate(date: Date) {
    const day = dayDate(date.toISOString().slice(0, 10))
    const users = await prisma.user.findMany({
      where: { role: 'USER', status: 'ACTIVE', kycStatus: 'APPROVED' },
      select: { id: true },
    })
    for (const user of users) {
      const wallets = await ledgerService.ensureWalletsForUser(user.id)
      const investment = wallets.find((w) => w.kind === 'INVESTMENT')
      const balance = wallets.reduce((acc, w) => acc.plus(d(w.balance)), d(0))
      const available = wallets.reduce((acc, w) => acc.plus(d(w.availableBalance)), d(0))
      const daily = await prisma.profitDistribution.aggregate({
        where: { userId: user.id, date: day, isReversed: false },
        _sum: { amount: true },
      })
      const invested = d(investment?.investedAmount ?? 0)
      const profit = d(investment?.totalProfit ?? 0)
      const roi = invested.gt(0) ? profit.div(invested).mul(100) : d(0)
      await prisma.portfolioSnapshot.upsert({
        where: { userId_date: { userId: user.id, date: day } },
        create: {
          userId: user.id,
          date: day,
          balance: moneyDisplay(balance),
          available: moneyDisplay(available),
          invested: moneyDisplay(invested),
          profit: moneyDisplay(profit),
          dailyProfit: moneyDisplay(daily._sum.amount ?? 0),
          portfolioValue: moneyDisplay(balance),
          roiPct: roi.toFixed(6),
        },
        update: {
          balance: moneyDisplay(balance),
          available: moneyDisplay(available),
          invested: moneyDisplay(invested),
          profit: moneyDisplay(profit),
          dailyProfit: moneyDisplay(daily._sum.amount ?? 0),
          portfolioValue: moneyDisplay(balance),
          roiPct: roi.toFixed(6),
        },
      })
    }
  },

  async recalculateGlobal() {
    const analytics = await this.analytics()
    const periodKey = dayKey(new Date())
    await prisma.performanceMetric.deleteMany({
      where: { scope: 'PLATFORM', period: 'DAILY', periodKey, userId: null },
    })
    await prisma.performanceMetric.create({
      data: {
        scope: 'PLATFORM',
        period: 'DAILY',
        periodKey,
        userId: null,
        metrics: analytics,
      },
    })
  },

  async walletSummaryExtras(userId: string) {
    const performance = await this.summary(userId)
    const chart = await this.series(userId, '30d')
    const todayKey = dayKey(new Date())
    const todayDist = await prisma.profitDistribution.findFirst({
      where: { userId, date: dayDate(todayKey), isReversed: false },
      orderBy: { createdAt: 'desc' },
    })
    const recentTrades = await prisma.trade.findMany({
      where: { isPublic: true, status: { in: ['OPEN', 'RUNNING', 'CLOSED'] } },
      orderBy: { tradeDate: 'desc' },
      take: 5,
    })
    const dayReturn = await prisma.dailyReturn.findUnique({ where: { date: dayDate(todayKey) } })
    return {
      today: {
        date: todayKey,
        profit: moneyDisplay(todayDist?.amount ?? 0),
        returnPct: todayDist ? d(todayDist.returnPct).toFixed(6) : '0.00',
        status: dayReturn?.status === 'DISTRIBUTED' ? ('DISTRIBUTED' as const) : ('PENDING' as const),
        tradeCount: dayReturn?.tradeCount ?? 0,
      },
      performance,
      chart,
      recentTrades: recentTrades.map(mapTrade),
    }
  },
}

function dayDate(input: string): Date {
  const x = new Date(input)
  x.setUTCHours(0, 0, 0, 0)
  return x
}
