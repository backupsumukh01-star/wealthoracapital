'use client'

/**
 * Historical Performance Center data layer.
 * The HPC presents the imported 4-year programme track record.
 * Prefer the published demo/backtest programme when it has a full history;
 * fall back to the public API when that import is missing or thin.
 */

import { useMemo } from 'react'
import type { Trade } from '@meridian/shared'

import { useLandingLiveStats } from '@/features/landing'
import {
  buildLandingLiveStats,
  resolveMonthlySeries,
  type LandingLiveStats,
  type LandingMonthlyPoint,
} from '@/features/landing/live-stats'
import { usePublicPerformance } from '@/features/performance/hooks'
import { usePublicTradeStats, usePublicTradesInfinite } from '@/features/trades/hooks'
import {
  useDemoCharts,
  useDemoDashboardStats,
  useDemoDailyReturns,
  useDemoMonthlyReturns,
  useDemoTrades,
} from '@/lib/demo-backtest'
import type { DemoTrade } from '@/lib/demo-backtest'

export type HpcTradeRow = {
  id: string
  date: string
  monthKey: string
  monthLabel: string
  pair: string
  direction: string
  entryPrice: string
  exitPrice: string
  returnPct: number
  status: string
  reference: string
  outcome: string
}

export type HpcDeskMetrics = {
  winRatePct: number
  tradeCount: number
  avgReturnPct: number
  publishedTrades: number
  largestWinPct: number | null
  largestLossPct: number | null
  bestMonthPct: number | null
  worstMonthPct: number | null
  avgMonthlyReturnPct: number | null
  avgDailyReturnPct: number | null
  longestWinStreak: number
  longestLossStreak: number
  tradingDays: number
  source: 'api' | 'demo'
}

/**
 * Monthly programme series for HPC — prefer the imported backtest when full (≥12 months).
 */
export function useHpcMonthlySeries(): {
  data: LandingMonthlyPoint[]
  isLoading: boolean
  source: 'demo' | 'api' | 'none'
} {
  const { data: pub, isLoading: pubLoading } = usePublicPerformance()
  const { data: demoMonthly, isLoading: demoLoading } = useDemoMonthlyReturns()

  const demoPoints = useMemo(
    () =>
      (demoMonthly ?? []).map((m) => ({
        month: m.yearMonth,
        returnPct: m.returnPct,
        label: m.label,
      })),
    [demoMonthly],
  )

  const apiPoints = useMemo(
    () => resolveMonthlySeries(pub?.monthly, undefined),
    [pub?.monthly],
  )

  const demoUsable = demoPoints.filter((m) => Math.abs(m.returnPct) > 0.0001)
  const apiUsable = apiPoints.filter((m) => Math.abs(m.returnPct) > 0.0001)

  if (demoUsable.length >= 12) {
    return { data: demoPoints, isLoading: demoLoading, source: 'demo' }
  }
  if (apiUsable.length >= 12) {
    return { data: apiPoints, isLoading: pubLoading, source: 'api' }
  }
  const fallback = resolveMonthlySeries(pub?.monthly, demoMonthly)
  return {
    data: fallback,
    isLoading: pubLoading || demoLoading,
    source: fallback.length ? (demoUsable.length >= apiUsable.length ? 'demo' : 'api') : 'none',
  }
}

/**
 * Headline programme KPIs for HPC — same imported dataset as monthly / growth table.
 */
export function useHpcProgrammeStats(): {
  stats: LandingLiveStats
  isLoading: boolean
  isReady: boolean
} {
  const { data: pub, isLoading: pubLoading } = usePublicPerformance()
  const { data: demo, isLoading: demoLoading } = useDemoDashboardStats()
  const { data: charts } = useDemoCharts()
  const { data: months, isLoading: monthsLoading } = useHpcMonthlySeries()
  const landing = useLandingLiveStats()

  const stats = useMemo(() => {
    const demoFull = Boolean(demo && demo.tradingDayCount >= 30 && demo.monthCount >= 12)
    if (demoFull) {
      return buildLandingLiveStats({
        pub: null,
        demo,
        demoMeta: charts?.meta,
        monthCount: Math.max(demo!.monthCount, months.length),
      })
    }
    return buildLandingLiveStats({
      pub,
      demo,
      demoMeta: charts?.meta,
      monthCount: months.length,
    })
  }, [pub, demo, charts?.meta, months.length])

  return {
    stats,
    isLoading: pubLoading || demoLoading || monthsLoading || landing.isLoading,
    isReady: Boolean(demo) || Boolean(pub) || months.length > 0,
  }
}

function monthKeyFromDate(date: string) {
  return date.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function mapApiTrade(t: Trade & { reference?: string; status?: string; tradeDate?: string }): HpcTradeRow {
  const date = String(t.date ?? t.tradeDate ?? '').slice(0, 10)
  const key = monthKeyFromDate(date)
  return {
    id: t.id,
    date,
    monthKey: key,
    monthLabel: monthLabel(key),
    pair: t.pair,
    direction: String(t.direction),
    entryPrice: t.entryPrice != null ? String(t.entryPrice) : '—',
    exitPrice: t.exitPrice != null ? String(t.exitPrice) : '—',
    returnPct: Number.parseFloat(String(t.returnPct ?? 0)) || 0,
    status: String(t.status ?? t.outcome ?? 'CLOSED'),
    reference: String(t.reference ?? t.id),
    outcome: String(t.outcome ?? (Number(t.returnPct) >= 0 ? 'WIN' : 'LOSS')),
  }
}

function mapDemoTrade(t: DemoTrade): HpcTradeRow {
  const date = String(t.tradeDate).slice(0, 10)
  const key = monthKeyFromDate(date)
  return {
    id: t.id,
    date,
    monthKey: key,
    monthLabel: monthLabel(key),
    pair: t.pair,
    direction: String(t.direction),
    entryPrice: t.entryPrice != null ? String(t.entryPrice) : '—',
    exitPrice: t.exitPrice != null ? String(t.exitPrice) : '—',
    returnPct: Number(t.returnPct) || 0,
    status: String(t.status ?? 'CLOSED'),
    reference: String(t.reference ?? t.id),
    outcome: String(t.outcome ?? (t.returnPct >= 0 ? 'WIN' : 'LOSS')),
  }
}

function longestStreak(rows: HpcTradeRow[], win: boolean) {
  let best = 0
  let cur = 0
  for (const r of rows) {
    const isWin = r.returnPct > 0 || r.outcome === 'WIN'
    if (isWin === win) {
      cur += 1
      best = Math.max(best, cur)
    } else {
      cur = 0
    }
  }
  return best
}

function usableTradeCount(n: number | null | undefined) {
  return typeof n === 'number' && n > 0
}

function usablePct(v: string | number | null | undefined) {
  if (v == null) return null
  const n = Number.parseFloat(String(v))
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

/** All published trades: API pages when non-empty, else demo blotter. */
export function useHpcTrades() {
  const api = usePublicTradesInfinite({ limit: 100 })
  const demo = useDemoTrades()

  const apiItems = useMemo(() => {
    const pages = api.data?.pages ?? []
    return pages.flatMap((p) => p.items ?? []).map((t) => mapApiTrade(t as Trade & { reference?: string }))
  }, [api.data])

  const demoItems = useMemo(
    () => (demo.data ?? []).map(mapDemoTrade).sort((a, b) => b.date.localeCompare(a.date)),
    [demo.data],
  )

  const usingDemo = demoItems.length >= 1000
  const usingApi = !usingDemo && apiItems.length > 0
  const trades = usingDemo ? demoItems : usingApi ? apiItems : demoItems

  // Keep pulling API pages when the API has data and we're not on the imported blotter
  const needsMore =
    usingApi && Boolean(api.hasNextPage) && !api.isFetchingNextPage && apiItems.length < 500

  return {
    trades,
    source: (usingDemo || !usingApi ? 'demo' : 'api') as 'api' | 'demo',
    isLoading: demo.isLoading || (!usingDemo && api.isLoading),
    isFetchingNextPage: api.isFetchingNextPage,
    hasNextPage: usingApi ? api.hasNextPage : false,
    fetchNextPage: api.fetchNextPage,
    needsMore,
    totalHint: usingDemo ? demoItems.length : usingApi ? apiItems.length : demoItems.length,
  }
}

/** Desk metrics from API when populated; otherwise demo stats + trade-derived fields. */
export function useHpcDeskMetrics(): {
  metrics: HpcDeskMetrics
  isLoading: boolean
} {
  const { data: apiStats, isLoading: statsLoading } = usePublicTradeStats()
  const { data: pub, isLoading: pubLoading } = usePublicPerformance()
  const { data: demo, isLoading: demoLoading } = useDemoDashboardStats()
  const { data: daily = [] } = useDemoDailyReturns()
  const { data: monthly = [] } = useHpcMonthlySeries()
  const { stats: landing } = useHpcProgrammeStats()
  const { trades } = useHpcTrades()

  const metrics = useMemo((): HpcDeskMetrics => {
    const demoFull = Boolean(demo && demo.tradingDayCount >= 30 && demo.monthCount >= 12)
    const apiTradeCount = demoFull
      ? demo!.tradeCount
      : (apiStats?.tradeCount ?? pub?.meta?.tradeCount ?? 0)
    const apiWin = demoFull
      ? demo!.winRatePct
      : usablePct(apiStats?.winRatePct ?? pub?.meta?.winRatePct)
    const apiHasData = demoFull || (usableTradeCount(apiTradeCount) && apiWin != null)

    const chronoSorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
    const wins = trades.filter((t) => t.returnPct > 0 || t.outcome === 'WIN')
    const sumRet = trades.reduce((s, t) => s + t.returnPct, 0)
    const largestWin = trades.length ? Math.max(...trades.map((t) => t.returnPct)) : null
    const largestLoss = trades.length ? Math.min(...trades.map((t) => t.returnPct)) : null

    const bestMonth = monthly.length ? Math.max(...monthly.map((m) => m.returnPct)) : null
    const worstMonth = monthly.length ? Math.min(...monthly.map((m) => m.returnPct)) : null
    const avgMonthly =
      monthly.length > 0
        ? monthly.reduce((s, m) => s + m.returnPct, 0) / monthly.length
        : usablePct(landing.avgMonthlyReturn) ??
          (demo ? demo.avgMonthlyReturnPct : null)

    const avgDaily =
      daily.length > 0
        ? daily.reduce((s, d) => s + d.netReturnPct, 0) / daily.length
        : null

    if (apiHasData) {
      return {
        winRatePct: Number(apiWin),
        tradeCount: apiTradeCount,
        avgReturnPct: Number.parseFloat(String(apiStats?.avgReturnPct ?? 0)) || sumRet / Math.max(trades.length, 1),
        publishedTrades: demoFull ? demo!.tradeCount : (apiStats?.closedTrades ?? apiTradeCount),
        largestWinPct:
          usablePct(demoFull ? demo!.bestDay.returnPct : apiStats?.bestTradeReturnPct) ??
          usablePct(pub?.analytics.bestTrade?.returnPct) ??
          largestWin,
        largestLossPct:
          usablePct(demoFull ? demo!.worstDay.returnPct : apiStats?.worstTradeReturnPct) ??
          usablePct(pub?.analytics.worstTrade?.returnPct) ??
          largestLoss,
        bestMonthPct: bestMonth,
        worstMonthPct: worstMonth,
        avgMonthlyReturnPct: demoFull
          ? demo!.avgMonthlyReturnPct
          : usablePct(pub?.meta?.avgMonthlyReturnPct) ?? avgMonthly,
        avgDailyReturnPct: avgDaily,
        longestWinStreak: longestStreak(chronoSorted, true),
        longestLossStreak: longestStreak(chronoSorted, false),
        tradingDays: demoFull
          ? demo!.tradingDayCount
          : (() => {
              const apiDays = pub?.meta?.tradingDayCount ?? 0
              const landingDays = Number(landing.tradingDays) || 0
              const demoDays = demo?.tradingDayCount ?? 0
              if (apiDays >= 30) return apiDays
              return Math.max(apiDays, landingDays, demoDays, daily.length)
            })(),
        source: demoFull ? 'demo' : 'api',
      }
    }

    const tradeCount = demo?.tradeCount ?? trades.length
    const winRate =
      demo?.winRatePct ??
      (trades.length ? (wins.length / trades.length) * 100 : 0)

    return {
      winRatePct: winRate,
      tradeCount,
      avgReturnPct: trades.length ? sumRet / trades.length : 0,
      publishedTrades: tradeCount,
      largestWinPct: largestWin,
      largestLossPct: largestLoss,
      bestMonthPct: bestMonth,
      worstMonthPct: worstMonth,
      avgMonthlyReturnPct: avgMonthly,
      avgDailyReturnPct: avgDaily,
      longestWinStreak: longestStreak(chronoSorted, true),
      longestLossStreak: longestStreak(chronoSorted, false),
      tradingDays: demo?.tradingDayCount ?? (Number(landing.tradingDays) || daily.length),
      source: 'demo',
    }
  }, [apiStats, pub, demo, daily, monthly, landing, trades])

  return {
    metrics,
    isLoading: statsLoading || pubLoading || demoLoading,
  }
}

export function useHpcChartSources() {
  const { data: pub } = usePublicPerformance()
  const { data: charts, isLoading: chartsLoading, isError: chartsError } = useDemoCharts()
  const { data: daily = [], isLoading: dailyLoading } = useDemoDailyReturns()
  const { data: monthly = [] } = useHpcMonthlySeries()

  return {
    charts,
    daily,
    monthly,
    pub,
    isLoading: chartsLoading || dailyLoading,
    isError: chartsError,
  }
}
