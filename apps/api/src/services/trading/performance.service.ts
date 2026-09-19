import { prisma } from '../../database/prisma.js'
import { ledgerService } from '../finance/ledger.service.js'
import { realInvestorUser } from '../demo-investor.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { mapTrade } from './trade.mappers.js'

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Compound percentage returns: (Π(1 + r/100) − 1) × 100. */
function compoundReturnPct(pcts: Array<string | number | ReturnType<typeof d>>) {
  let factor = d(1)
  for (const pct of pcts) {
    factor = factor.mul(d(1).plus(d(pct).div(100)))
  }
  return factor.minus(1).mul(100)
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

    // Historical % metrics must NOT depend on current investedAmount / availableBalance.
    // Withdrawals (pending lock or paid) change financial state only — never erase track record.
    // Prefer lifetime deposits as the money ROI denominator; compound stored daily returnPcts when present.
    const wallet = userId
      ? await prisma.wallet.findUnique({
          where: { userId_kind: { userId, kind: 'INVESTMENT' } },
          select: { investedAmount: true, totalDeposited: true },
        })
      : null
    const deposited = userId
      ? d(wallet?.totalDeposited ?? 0)
      : d(
          (
            await prisma.wallet.aggregate({
              where: { kind: 'INVESTMENT' },
              _sum: { totalDeposited: true },
            })
          )._sum.totalDeposited ?? 0,
        )
    // Fallback capital basis if deposits were never bumped (legacy/adjust-only accounts).
    const invested = userId
      ? d(wallet?.investedAmount ?? 0)
      : d(
          (
            await prisma.wallet.aggregate({
              where: { kind: 'INVESTMENT' },
              _sum: { investedAmount: true },
            })
          )._sum.investedAmount ?? 0,
        )
    const capitalBasis = deposited.gt(0) ? deposited : invested

    type DayAgg = { profit: ReturnType<typeof d>; pcts: Array<string | number | ReturnType<typeof d>> }
    const byDay = new Map<string, DayAgg>()
    for (const row of distributions) {
      const key = dayKey(row.date)
      const entry = byDay.get(key) ?? { profit: d(0), pcts: [] }
      entry.profit = entry.profit.plus(d(row.amount))
      entry.pcts.push(
        effectiveReturnPct(
          d(row.amount),
          d(row.returnPct),
          d(row.eligibleBalance ?? 0),
          capitalBasis,
        ),
      )
      byDay.set(key, entry)
    }

    const dayEntries = [...byDay.entries()].map(([date, agg]) => {
      const returnPct = agg.pcts.length > 0 ? compoundReturnPct(agg.pcts) : d(0)
      return { date, profit: agg.profit, returnPct }
    })

    let bestDay: { date: string; returnPct: string; profit: string } | null = null
    let worstDay: { date: string; returnPct: string; profit: string } | null = null
    for (const row of dayEntries) {
      const point = {
        date: row.date,
        returnPct: row.returnPct.toFixed(6),
        profit: moneyDisplay(row.profit),
      }
      if (!bestDay || row.returnPct.gt(d(bestDay.returnPct))) bestDay = point
      if (!worstDay || row.returnPct.lt(d(worstDay.returnPct))) worstDay = point
    }

    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const thisMonthDays = dayEntries.filter((r) => r.date >= dayKey(monthStart))
    const lastMonthDays = dayEntries.filter(
      (r) => r.date >= dayKey(lastMonthStart) && r.date < dayKey(monthStart),
    )
    const thisMonthProfit = thisMonthDays.reduce((acc, r) => acc.plus(r.profit), d(0))
    const lastMonthProfit = lastMonthDays.reduce((acc, r) => acc.plus(r.profit), d(0))

    const lifetimePcts = dayEntries.map((r) => r.returnPct)
    const roiFromHistory =
      lifetimePcts.some((pct) => pct.abs().gt(0)) ? compoundReturnPct(lifetimePcts) : null
    const roiFromMoney = capitalBasis.gt(0) ? totalProfit.div(capitalBasis).mul(100) : d(0)
    const roiPct = roiFromHistory ?? roiFromMoney

    const thisMonthReturnPct =
      thisMonthDays.length > 0
        ? compoundReturnPct(thisMonthDays.map((r) => r.returnPct))
        : capitalBasis.gt(0)
          ? thisMonthProfit.div(capitalBasis).mul(100)
          : d(0)
    const lastMonthReturnPct =
      lastMonthDays.length > 0
        ? compoundReturnPct(lastMonthDays.map((r) => r.returnPct))
        : capitalBasis.gt(0)
          ? lastMonthProfit.div(capitalBasis).mul(100)
          : d(0)

    const closedTrades = await prisma.trade.count({
      where: { status: 'CLOSED', ...(userId ? {} : {}) },
    })
    const wins = await prisma.trade.count({
      where: { status: 'CLOSED', outcome: 'WIN' },
    })

    // Prefer programme trade win-rate; if no trades, use share of positive distribution days.
    const positiveDays = dayEntries.filter((r) => r.returnPct.gt(0)).length
    const winRatePct = closedTrades
      ? d(wins).div(closedTrades).mul(100).toFixed(2)
      : dayEntries.length
        ? d(positiveDays).div(dayEntries.length).mul(100).toFixed(2)
        : '0.00'

    const avgDaily =
      dayEntries.length > 0
        ? dayEntries.reduce((acc, r) => acc.plus(r.returnPct), d(0)).div(dayEntries.length)
        : d(0)

    return {
      roiPct: roiPct.toFixed(6),
      thisMonthProfit: moneyDisplay(thisMonthProfit),
      thisMonthReturnPct: thisMonthReturnPct.toFixed(6),
      lastMonthReturnPct: lastMonthReturnPct.toFixed(6),
      bestDay,
      worstDay,
      winRatePct,
      activeDays: dayEntries.length,
      avgDailyReturnPct: avgDaily.toFixed(6),
    }
  },

  async series(userId: string | undefined, range: string) {
    const days = seriesDayCount(range)
    const from = utcDay()
    from.setUTCDate(from.getUTCDate() - (days - 1))

    if (userId) {
      return { range, points: await reconstructInvestorEquity(userId, from) }
    }

    const dists = await prisma.profitDistribution.findMany({
      where: { isReversed: false, date: { gte: from } },
      orderBy: { date: 'asc' },
    })
    let cumulative = d(0)
    const byDay = new Map<string, ReturnType<typeof d>>()
    for (const row of dists) {
      const key = dayKey(row.date)
      byDay.set(key, (byDay.get(key) ?? d(0)).plus(d(row.amount)))
    }
    const points = [...byDay.entries()].map(([date, profit]) => {
      cumulative = cumulative.plus(profit)
      return {
        date,
        balance: moneyDisplay(cumulative),
        profit: moneyDisplay(profit),
        cumulativeProfit: moneyDisplay(cumulative),
      }
    })
    return { range, points }
  },

  /**
   * Programme monthly compounds from published DailyReturn rows (desk settlements).
   * Used for public marketing when DailyReturnRun rows are sparse/absent (e.g. seeded backtest).
   */
  async monthlyFromDailyReturns() {
    const days = await prisma.dailyReturn.findMany({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        netReturnPct: true,
        computedReturnPct: true,
        tradeCount: true,
        winCount: true,
        lossCount: true,
      },
    })
    const byMonth = new Map<
      string,
      { pcts: string[]; tradeCount: number; tradingDays: number; wins: number; losses: number }
    >()
    for (const row of days) {
      const key = dayKey(row.date).slice(0, 7)
      const entry = byMonth.get(key) ?? {
        pcts: [],
        tradeCount: 0,
        tradingDays: 0,
        wins: 0,
        losses: 0,
      }
      entry.pcts.push(String(row.netReturnPct ?? row.computedReturnPct ?? 0))
      entry.tradeCount += row.tradeCount
      entry.tradingDays += 1
      entry.wins += row.winCount
      entry.losses += row.lossCount
      byMonth.set(key, entry)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => {
        const returnPct = compoundReturnPct(v.pcts)
        return {
          month,
          returnPct: returnPct.toFixed(6),
          profit: moneyDisplay(0),
          tradingDays: v.tradingDays,
          tradeCount: v.tradeCount,
          winRatePct:
            v.wins + v.losses > 0
              ? d(v.wins)
                  .div(v.wins + v.losses)
                  .mul(100)
                  .toFixed(2)
              : '0.00',
        }
      })
  },

  async monthly(userId?: string) {
    const profitByMonth = new Map<string, ReturnType<typeof d>>()
    const pctsByMonth = new Map<string, Array<string | number | ReturnType<typeof d>>>()

    if (userId) {
      const dists = await prisma.profitDistribution.findMany({
        where: { userId, isReversed: false },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      })
      const wallet = await prisma.wallet.findUnique({
        where: { userId_kind: { userId, kind: 'INVESTMENT' } },
        select: { totalDeposited: true, investedAmount: true },
      })
      const capitalBasis = d(wallet?.totalDeposited ?? 0).gt(0)
        ? d(wallet?.totalDeposited ?? 0)
        : d(wallet?.investedAmount ?? 0)
      for (const row of dists) {
        const key = dayKey(row.date).slice(0, 7)
        profitByMonth.set(key, (profitByMonth.get(key) ?? d(0)).plus(d(row.amount)))
        const list = pctsByMonth.get(key) ?? []
        list.push(
          effectiveReturnPct(
            d(row.amount),
            d(row.returnPct),
            d(row.eligibleBalance ?? 0),
            capitalBasis,
          ),
        )
        pctsByMonth.set(key, list)
      }
    } else {
      const dists = await prisma.profitDistribution.findMany({
        where: { isReversed: false },
      })
      for (const row of dists) {
        const key = dayKey(row.date).slice(0, 7)
        profitByMonth.set(key, (profitByMonth.get(key) ?? d(0)).plus(d(row.amount)))
      }

      // Programme return: compound completed settlement runs (not summed wallet profits).
      const runs = await prisma.dailyReturnRun.findMany({
        where: { status: 'COMPLETED' },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: { date: true, returnPct: true },
      })
      for (const run of runs) {
        const key = dayKey(run.date).slice(0, 7)
        const list = pctsByMonth.get(key) ?? []
        list.push(run.returnPct.toString())
        pctsByMonth.set(key, list)
      }
    }

    const months = new Set([...profitByMonth.keys(), ...pctsByMonth.keys()])
    let rows = [...months]
      .sort((a, b) => a.localeCompare(b))
      .map((month) => {
        const profit = profitByMonth.get(month) ?? d(0)
        const pcts = pctsByMonth.get(month) ?? []
        const returnPct = pcts.length > 0 ? compoundReturnPct(pcts) : d(0)
        return {
          month,
          returnPct: returnPct.toFixed(6),
          profit: moneyDisplay(profit),
        }
      })

    // Public programme view: prefer published DailyReturn history when runs/distributions are thin.
    if (!userId) {
      const fromDays = await this.monthlyFromDailyReturns()
      const liveSignal = rows.filter((r) => Math.abs(Number(r.returnPct)) > 0.0001).length
      if (fromDays.length > liveSignal) {
        rows = fromDays.map((r) => ({
          month: r.month,
          returnPct: r.returnPct,
          profit: r.profit,
        }))
      }
    }

    return rows
  },

  async yearly(userId?: string) {
    const monthly = await this.monthly(userId)
    const fromDays = !userId ? await this.monthlyFromDailyReturns() : []
    const enrich = new Map(fromDays.map((r) => [r.month, r]))

    const profitByYear = new Map<string, ReturnType<typeof d>>()
    const pctsByYear = new Map<string, string[]>()
    const daysByYear = new Map<string, number>()
    const tradesByYear = new Map<string, number>()
    const winsByYear = new Map<string, number>()
    const lossesByYear = new Map<string, number>()

    for (const row of monthly) {
      const year = row.month.slice(0, 4)
      profitByYear.set(year, (profitByYear.get(year) ?? d(0)).plus(d(row.profit)))
      const list = pctsByYear.get(year) ?? []
      list.push(row.returnPct)
      pctsByYear.set(year, list)
      const extra = enrich.get(row.month)
      if (extra) {
        daysByYear.set(year, (daysByYear.get(year) ?? 0) + extra.tradingDays)
        tradesByYear.set(year, (tradesByYear.get(year) ?? 0) + extra.tradeCount)
        // Approximate win/loss share from monthly winRate when available
        const wr = Number(extra.winRatePct) / 100
        const wins = Math.round(extra.tradeCount * wr)
        winsByYear.set(year, (winsByYear.get(year) ?? 0) + wins)
        lossesByYear.set(year, (lossesByYear.get(year) ?? 0) + (extra.tradeCount - wins))
      }
    }

    // Prefer exact trade counts from Trade table when public
    if (!userId) {
      const closed = await prisma.trade.findMany({
        where: { status: 'CLOSED', isPublic: true },
        select: { tradeDate: true, outcome: true },
      })
      daysByYear.clear()
      tradesByYear.clear()
      winsByYear.clear()
      lossesByYear.clear()
      // trading days from DailyReturn
      const dayRows = await prisma.dailyReturn.findMany({
        where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
        select: { date: true },
      })
      for (const row of dayRows) {
        const year = dayKey(row.date).slice(0, 4)
        daysByYear.set(year, (daysByYear.get(year) ?? 0) + 1)
      }
      for (const t of closed) {
        const year = dayKey(t.tradeDate).slice(0, 4)
        tradesByYear.set(year, (tradesByYear.get(year) ?? 0) + 1)
        if (t.outcome === 'WIN') winsByYear.set(year, (winsByYear.get(year) ?? 0) + 1)
        if (t.outcome === 'LOSS') lossesByYear.set(year, (lossesByYear.get(year) ?? 0) + 1)
      }
    }

    return [...profitByYear.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((year) => {
        const profit = profitByYear.get(year) ?? d(0)
        const pcts = pctsByYear.get(year) ?? []
        const returnPct = pcts.length > 0 ? compoundReturnPct(pcts) : d(0)
        const trades = tradesByYear.get(year) ?? 0
        const wins = winsByYear.get(year) ?? 0
        const losses = lossesByYear.get(year) ?? 0
        return {
          year,
          returnPct: returnPct.toFixed(6),
          profit: moneyDisplay(profit),
          tradingDays: daysByYear.get(year) ?? 0,
          tradeCount: trades,
          winRatePct:
            wins + losses > 0
              ? d(wins)
                  .div(wins + losses)
                  .mul(100)
                  .toFixed(2)
              : '0.00',
        }
      })
  },

  /**
   * Public marketing track-record meta derived from DailyReturn + public trades.
   * Always prefers the published DailyReturn ledger when present; if that series is
   * thin relative to the public trade blotter, fills gaps from trade dates / returns
   * so marketing KPIs never collapse to placeholder 0% / 1-day values.
   */
  async publicMeta() {
    const days = await prisma.dailyReturn.findMany({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
      orderBy: { date: 'asc' },
      select: { date: true, netReturnPct: true, computedReturnPct: true },
    })
    const monthly = await this.monthlyFromDailyReturns()
    const closedTrades = await prisma.trade.findMany({
      where: { status: 'CLOSED', isPublic: true },
      select: { tradeDate: true, returnPct: true, outcome: true },
      orderBy: { tradeDate: 'asc' },
    })
    const closed = closedTrades.length
    const wins = closedTrades.filter((t) => t.outcome === 'WIN').length

    // Per-day programme returns (DailyReturn) — primary source for equity KPIs.
    const dayPoints = days.map((row) => ({
      date: dayKey(row.date),
      returnPct: Number(row.netReturnPct ?? row.computedReturnPct ?? 0),
    }))

    // Trade blotter span — used when DailyReturn is incomplete vs imported history.
    const tradeDayMap = new Map<string, number[]>()
    for (const t of closedTrades) {
      const key = dayKey(t.tradeDate)
      const list = tradeDayMap.get(key) ?? []
      list.push(Number(t.returnPct ?? 0))
      tradeDayMap.set(key, list)
    }
    const tradeDayKeys = [...tradeDayMap.keys()].sort((a, b) => a.localeCompare(b))

    const useTradeCalendar = dayPoints.length < 30 && tradeDayKeys.length > dayPoints.length

    const calendarPoints = useTradeCalendar
      ? tradeDayKeys.map((date) => {
          const rets = tradeDayMap.get(date) ?? []
          // Approximate desk day return as compound of that day's published trades.
          const factor = rets.reduce((acc, r) => acc * (1 + r / 100), 1)
          return { date, returnPct: (factor - 1) * 100 }
        })
      : dayPoints

    let equity = d(100)
    let peak = d(100)
    let maxDd = d(0)
    for (const point of calendarPoints) {
      const pct = d(point.returnPct)
      equity = equity.mul(d(1).plus(pct.div(100)))
      if (equity.gt(peak)) peak = equity
      const dd = peak.gt(0) ? peak.minus(equity).div(peak).mul(100) : d(0)
      if (dd.gt(maxDd)) maxDd = dd
    }

    const startDate =
      calendarPoints[0]?.date ??
      (tradeDayKeys[0] ?? null)
    const endDate =
      calendarPoints.length > 0
        ? calendarPoints[calendarPoints.length - 1]!.date
        : (tradeDayKeys[tradeDayKeys.length - 1] ?? null)

    let years = 0
    if (startDate && endDate) {
      const ms = Date.parse(endDate) - Date.parse(startDate)
      years = Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000))
    }
    const monthSpan = Math.max(monthly.length, calendarPoints.length > 0
      ? new Set(calendarPoints.map((p) => p.date.slice(0, 7))).size
      : 0)
    // Prefer date-span years; if thin, derive from month count (37 months → 3).
    let yearsOfPerformance =
      years >= 2.5 ? Math.round(years) : years > 0 ? Number(years.toFixed(2)) : 0
    if (yearsOfPerformance < 1 && monthSpan >= 12) {
      yearsOfPerformance = Math.max(1, Math.round(monthSpan / 12))
    } else if (yearsOfPerformance < 1 && monthSpan > 0) {
      yearsOfPerformance = Number((monthSpan / 12).toFixed(2))
    }
    // Keep CAGR / display years consistent with month span when dates say ~3y.
    if (monthSpan >= 30 && yearsOfPerformance < 2) {
      yearsOfPerformance = Math.max(1, Math.round(monthSpan / 12))
    }

    const totalReturnPct = equity.minus(100)
    const cagrYears = Math.max(years > 0 ? years : Number(yearsOfPerformance) || 0, 1 / 12)
    const cagr =
      calendarPoints.length > 0
        ? d(Math.pow(Number(equity.div(100).toString()), 1 / cagrYears) - 1).mul(100)
        : d(0)

    // Prefer DailyReturn months; if thin, compound calendarPoints into months; last resort settlement monthly().
    type MonthAvgRow = { month: string; returnPct: string }
    let monthlyForAvg: MonthAvgRow[] = monthly.filter((m) => Math.abs(Number(m.returnPct)) > 0.0001)
    if (monthlyForAvg.length < 6 && calendarPoints.length > 0) {
      const byMonth = new Map<string, number[]>()
      for (const point of calendarPoints) {
        const key = point.date.slice(0, 7)
        const list = byMonth.get(key) ?? []
        list.push(point.returnPct)
        byMonth.set(key, list)
      }
      monthlyForAvg = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, pcts]) => {
          const factor = pcts.reduce((acc, r) => acc * (1 + r / 100), 1)
          return { month, returnPct: ((factor - 1) * 100).toFixed(6) }
        })
        .filter((m) => Math.abs(Number(m.returnPct)) > 0.0001)
    }
    if (monthlyForAvg.length < 6) {
      monthlyForAvg = (await this.monthly()).filter((m) => Math.abs(Number(m.returnPct)) > 0.0001)
    }
    const avgMonthly =
      monthlyForAvg.length > 0
        ? monthlyForAvg.reduce((acc, m) => acc.plus(d(m.returnPct)), d(0)).div(monthlyForAvg.length)
        : d(0)

    let bestDay: { date: string; returnPct: string } | null = null
    let worstDay: { date: string; returnPct: string } | null = null
    for (const point of calendarPoints) {
      const row = { date: point.date, returnPct: point.returnPct.toFixed(6) }
      if (!bestDay || point.returnPct > Number(bestDay.returnPct)) bestDay = row
      if (!worstDay || point.returnPct < Number(worstDay.returnPct)) worstDay = row
    }

    const tradingDayCount = Math.max(dayPoints.length, useTradeCalendar ? tradeDayKeys.length : 0)

    return {
      tradingDayCount,
      tradeCount: closed,
      winRatePct: closed ? d(wins).div(closed).mul(100).toFixed(2) : '0.00',
      monthCount: Math.max(monthly.length, monthlyForAvg.length),
      startDate,
      endDate,
      startingEquity: '100',
      endingEquity: equity.toFixed(4),
      totalReturnPct: totalReturnPct.toFixed(2),
      cagrPct: cagr.toFixed(2),
      avgMonthlyReturnPct: avgMonthly.toFixed(2),
      maxDrawdownPct: maxDd.toFixed(2),
      bestDay,
      worstDay,
      yearsOfPerformance,
    }
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
      where: { ...realInvestorUser, status: 'ACTIVE', kycStatus: 'APPROVED' },
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

  async investorAnalyticsCharts(userId: string, range = '90d') {
    const equitySeries = await this.series(userId, range)

    // Historical day return % from stored distribution rows — independent of current wallet balances.
    const dists = await prisma.profitDistribution.findMany({
      where: { userId, isReversed: false },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: { date: true, returnPct: true, amount: true, eligibleBalance: true },
    })
    const wallet = await prisma.wallet.findUnique({
      where: { userId_kind: { userId, kind: 'INVESTMENT' } },
      select: { totalDeposited: true, investedAmount: true },
    })
    const capitalBasis = d(wallet?.totalDeposited ?? 0).gt(0)
      ? d(wallet?.totalDeposited ?? 0)
      : d(wallet?.investedAmount ?? 0)
    const pctByDay = new Map<string, Array<string | number | ReturnType<typeof d>>>()
    for (const row of dists) {
      const key = dayKey(row.date)
      const list = pctByDay.get(key) ?? []
      list.push(
        effectiveReturnPct(
          d(row.amount),
          d(row.returnPct),
          d(row.eligibleBalance ?? 0),
          capitalBasis,
        ),
      )
      pctByDay.set(key, list)
    }

    const dailyProfit = equitySeries.points.map((point) => {
      const profit = d(point.profit)
      const stored = pctByDay.get(point.date) ?? []
      const returnPct =
        stored.some((pct) => d(pct).abs().gt(0))
          ? compoundReturnPct(stored)
          : capitalBasis.gt(0)
            ? profit.div(capitalBasis).mul(100)
            : d(0)
      return {
        date: point.date,
        label: point.date.slice(5),
        profit: point.profit,
        cumulativeProfit: point.cumulativeProfit,
        balance: point.balance,
        returnPct: returnPct.toFixed(6),
      }
    })

    // monthly() already compounds stored distribution returnPct — do not re-scale by current invested.
    const monthly = await this.monthly(userId)
    return {
      range: equitySeries.range,
      equity: equitySeries.points,
      dailyProfit,
      monthly: monthly.map((row) => ({
        month: row.month,
        profit: row.profit,
        returnPct: row.returnPct,
      })),
    }
  },

  async walletSummaryExtras(userId: string) {
    const performance = await this.summary(userId)
    const chart = await this.series(userId, '30d')
    const analyticsCharts = await this.investorAnalyticsCharts(userId, '90d')
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
      analyticsCharts,
      recentTrades: recentTrades.map(mapTrade),
    }
  },
}

function dayDate(input: string): Date {
  const x = new Date(input)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function utcDay(date = new Date()): Date {
  const x = new Date(date)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function seriesDayCount(range: string): number {
  switch (range) {
    case '1d':
      return 1
    case '7d':
      return 7
    case '90d':
      return 90
    case '180d':
      return 180
    case '1y':
      return 365
    case 'all':
      return 3650
    default:
      return 30
  }
}

type DayFlow = {
  deposit: ReturnType<typeof d>
  withdrawal: ReturnType<typeof d>
  profit: ReturnType<typeof d>
}

function emptyFlow(): DayFlow {
  return { deposit: d(0), withdrawal: d(0), profit: d(0) }
}

function effectiveReturnPct(
  amount: ReturnType<typeof d>,
  storedPct: ReturnType<typeof d>,
  eligibleBalance: ReturnType<typeof d>,
  capitalBasis: ReturnType<typeof d>,
) {
  if (storedPct.abs().gt(0)) return storedPct
  if (eligibleBalance.gt(0)) return amount.div(eligibleBalance).mul(100)
  if (capitalBasis.gt(0)) return amount.div(capitalBasis).mul(100)
  return d(0)
}

async function reconstructInvestorEquity(userId: string, from: Date) {
  const [deposits, withdrawals, dists] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId, status: 'APPROVED' },
      select: { createdAt: true, creditedAmount: true, amount: true },
    }),
    prisma.withdrawal.findMany({
      where: { userId, status: { in: ['PAID', 'COMPLETED'] } },
      select: { paidAt: true, createdAt: true, amount: true },
    }),
    prisma.profitDistribution.findMany({
      where: { userId, isReversed: false },
      select: { date: true, amount: true },
    }),
  ])

  const flows = new Map<string, DayFlow>()
  const add = (key: string, field: keyof DayFlow, amount: ReturnType<typeof d>) => {
    const row = flows.get(key) ?? emptyFlow()
    row[field] = row[field].plus(amount)
    flows.set(key, row)
  }

  for (const row of deposits) {
    add(dayKey(row.createdAt), 'deposit', d(row.creditedAmount ?? row.amount))
  }
  for (const row of withdrawals) {
    add(dayKey(row.paidAt ?? row.createdAt), 'withdrawal', d(row.amount))
  }
  for (const row of dists) {
    add(dayKey(row.date), 'profit', d(row.amount))
  }

  const keys = [...flows.keys()].sort()
  if (keys.length === 0) return []

  const first = utcDay(new Date(`${keys[0]}T00:00:00.000Z`))
  const last = utcDay()
  const fromDay = utcDay(from)
  const emitFrom = fromDay > first ? fromDay : first

  let balance = d(0)
  let cumulative = d(0)
  const points: Array<{
    date: string
    balance: string
    profit: string
    cumulativeProfit: string
  }> = []

  for (let cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = dayKey(cursor)
    const flow = flows.get(key) ?? emptyFlow()
    balance = balance.plus(flow.deposit).minus(flow.withdrawal).plus(flow.profit)
    cumulative = cumulative.plus(flow.profit)
    if (cursor >= emitFrom) {
      points.push({
        date: key,
        balance: moneyDisplay(balance),
        profit: moneyDisplay(flow.profit),
        cumulativeProfit: moneyDisplay(cumulative),
      })
    }
  }

  return points
}
