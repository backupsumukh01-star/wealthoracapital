'use client'

/**
 * Historical Performance Center data layer.
 * Prefer live public APIs; when the API returns empty/zero payloads, fall back to
 * the published demo/backtest JSON (same imported history — not regenerated).
 */

import { useMemo } from 'react'
import type { Trade } from '@meridian/shared'

import { useLandingLiveStats, useLandingMonthlySeries } from '@/features/landing'
import { usePublicPerformance } from '@/features/performance/hooks'
import { usePublicTradeStats, usePublicTradesInfinite } from '@/features/trades/hooks'
import {
  useDemoCharts,
  useDemoDashboardStats,
  useDemoDailyReturns,
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

  const usingApi = apiItems.length > 0
  const trades = usingApi ? apiItems : demoItems

  // Keep pulling API pages when the API has data
  const needsMore =
    usingApi && Boolean(api.hasNextPage) && !api.isFetchingNextPage && apiItems.length < 500

  return {
    trades,
    source: (usingApi ? 'api' : 'demo') as 'api' | 'demo',
    isLoading: api.isLoading || (!usingApi && demo.isLoading),
    isFetchingNextPage: api.isFetchingNextPage,
    hasNextPage: usingApi ? api.hasNextPage : false,
    fetchNextPage: api.fetchNextPage,
    needsMore,
    totalHint: usingApi ? apiItems.length : demoItems.length,
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
  const { data: monthly = [] } = useLandingMonthlySeries()
  const { stats: landing } = useLandingLiveStats()
  const { trades } = useHpcTrades()

  const metrics = useMemo((): HpcDeskMetrics => {
    const apiTradeCount = apiStats?.tradeCount ?? pub?.meta?.tradeCount ?? 0
    const apiWin = usablePct(apiStats?.winRatePct ?? pub?.meta?.winRatePct)
    const apiHasData = usableTradeCount(apiTradeCount) && apiWin != null

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
        winRatePct: apiWin!,
        tradeCount: apiTradeCount,
        avgReturnPct: Number.parseFloat(String(apiStats?.avgReturnPct ?? 0)) || sumRet / Math.max(trades.length, 1),
        publishedTrades: apiStats?.closedTrades ?? apiTradeCount,
        largestWinPct:
          usablePct(apiStats?.bestTradeReturnPct) ??
          usablePct(pub?.analytics.bestTrade?.returnPct) ??
          largestWin,
        largestLossPct:
          usablePct(apiStats?.worstTradeReturnPct) ??
          usablePct(pub?.analytics.worstTrade?.returnPct) ??
          largestLoss,
        bestMonthPct: bestMonth,
        worstMonthPct: worstMonth,
        avgMonthlyReturnPct: usablePct(pub?.meta?.avgMonthlyReturnPct) ?? avgMonthly,
        avgDailyReturnPct: avgDaily,
        longestWinStreak: longestStreak(chronoSorted, true),
        longestLossStreak: longestStreak(chronoSorted, false),
        tradingDays: (() => {
          const apiDays = pub?.meta?.tradingDayCount ?? 0
          const landingDays = Number(landing.tradingDays) || 0
          const demoDays = demo?.tradingDayCount ?? 0
          // Prefer the fuller calendar when API meta is a thin stub (e.g. 1 day).
          if (apiDays >= 30) return apiDays
          return Math.max(apiDays, landingDays, demoDays, daily.length)
        })(),
        source: 'api',
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
  const { data: monthly = [] } = useLandingMonthlySeries()

  return {
    charts,
    daily,
    monthly,
    pub,
    isLoading: chartsLoading || dailyLoading,
    isError: chartsError,
  }
}
