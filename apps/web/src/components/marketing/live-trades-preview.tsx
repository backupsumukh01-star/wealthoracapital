'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Radio } from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { demoHistoryUsable } from '@/features/landing/live-stats'
import { usePublicPerformance } from '@/features/performance/hooks'
import { usePublicTradeStats, usePublicTradesInfinite } from '@/features/trades/hooks'
import { useDemoDashboardStats, useDemoTrades } from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'
import type { Trade } from '@meridian/shared'
import type { DemoTrade } from '@/lib/demo-backtest'

type DeskTrade = {
  id: string
  date: string
  pair: string
  direction: 'BUY' | 'SELL'
  entry: string
  exit: string
  returnPct: number
  status: string
}

function toDeskFromApi(t: Trade & { status?: string; reference?: string }): DeskTrade {
  return {
    id: t.id,
    date: String(t.date ?? '').slice(0, 10),
    pair: t.pair,
    direction: t.direction === 'SELL' ? 'SELL' : 'BUY',
    entry: t.entryPrice != null ? String(t.entryPrice) : '—',
    exit: t.exitPrice != null ? String(t.exitPrice) : '—',
    returnPct: Number.parseFloat(String(t.returnPct ?? 0)) || 0,
    status: t.status ?? 'CLOSED',
  }
}

function toDeskFromDemo(t: DemoTrade): DeskTrade {
  return {
    id: t.id,
    date: String(t.tradeDate).slice(0, 10),
    pair: t.pair,
    direction: t.direction === 'SELL' ? 'SELL' : 'BUY',
    entry: String(t.entryPrice),
    exit: String(t.exitPrice),
    returnPct: Number(t.returnPct) || 0,
    status: t.status || 'CLOSED',
  }
}

function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

const TradeRow = memo(function TradeRow({ trade }: { trade: DeskTrade }) {
  const up = trade.returnPct >= 0
  return (
    <li
      className={cn(
        'grid shrink-0 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/[0.05] px-3 py-2.5',
        'sm:grid-cols-[5.5rem_4.5rem_3.25rem_minmax(0,1fr)_minmax(0,1fr)_4.5rem_4.25rem] sm:gap-3 sm:px-4',
      )}
    >
      <span className="tabular-nums text-[11px] text-fg-subtle sm:text-[12px]">{trade.date}</span>
      <span className="truncate text-[13px] font-medium text-fg">{trade.pair}</span>
      <span
        className={cn(
          'hidden rounded-md px-1.5 py-0.5 text-center text-[10px] font-medium uppercase sm:inline',
          trade.direction === 'BUY'
            ? 'bg-accent-500/15 text-accent-200'
            : 'bg-raised text-fg-muted',
        )}
      >
        {trade.direction}
      </span>
      <span className="hidden truncate text-right text-[11px] tabular-nums text-fg-muted sm:inline">
        {trade.entry}
      </span>
      <span className="hidden truncate text-right text-[11px] tabular-nums text-fg-muted sm:inline">
        {trade.exit}
      </span>
      <span
        className={cn(
          'text-right text-[13px] font-medium tabular-nums',
          up ? 'text-profit' : 'text-loss',
        )}
      >
        {formatPct(trade.returnPct, 2)}
      </span>
      <span className="hidden text-right text-[10px] uppercase tracking-wide text-fg-subtle sm:inline">
        {trade.status}
      </span>
      {/* Mobile secondary line */}
      <span className="col-span-3 flex items-center justify-between gap-2 text-[10px] text-fg-subtle sm:hidden">
        <span>
          {trade.direction} · {trade.entry} → {trade.exit}
        </span>
        <span>{trade.status}</span>
      </span>
    </li>
  )
})

function computeStatsFromTrades(trades: DeskTrade[]) {
  if (!trades.length) return null
  const wins = trades.filter((t) => t.returnPct > 0)
  const losses = trades.filter((t) => t.returnPct < 0)
  const avg = trades.reduce((a, t) => a + t.returnPct, 0) / trades.length
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.returnPct, 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((a, t) => a + t.returnPct, 0) / losses.length : 0
  const best = Math.max(...trades.map((t) => t.returnPct))
  const worst = Math.min(...trades.map((t) => t.returnPct))
  return {
    winRatePct: (wins.length / trades.length) * 100,
    tradeCount: trades.length,
    avgReturnPct: avg,
    avgWinPct: avgWin,
    avgLossPct: avgLoss,
    bestPct: best,
    worstPct: worst,
  }
}

/** Public desk feed — canonical demo blotter when present, live API only as fallback. */
export function LiveTradesPreview() {
  const apiInfinite = usePublicTradesInfinite({ limit: 40 })
  const { data: apiStats } = usePublicTradeStats()
  const { data: pub } = usePublicPerformance()
  const { data: demoTrades = [], isLoading: demoLoading } = useDemoTrades()
  const { data: demoStats } = useDemoDashboardStats()

  const apiTrades = useMemo(
    () => apiInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [apiInfinite.data],
  )

  const demoOk = demoHistoryUsable(demoStats)
  const useDemo = demoOk || (!apiInfinite.isLoading && apiTrades.length === 0)

  const deskTrades = useMemo(() => {
    if (useDemo) {
      return [...demoTrades]
        .sort((a, b) => String(b.tradeDate).localeCompare(String(a.tradeDate)))
        .map(toDeskFromDemo)
    }
    return apiTrades.map((t) => toDeskFromApi(t as Trade & { status?: string }))
  }, [useDemo, apiTrades, demoTrades])

  const [visible, setVisible] = useState(40)
  const listRef = useRef<HTMLUListElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const shown = useMemo(() => deskTrades.slice(0, visible), [deskTrades, visible])

  const loadMore = useCallback(() => {
    if (!useDemo && apiInfinite.hasNextPage && !apiInfinite.isFetchingNextPage) {
      void apiInfinite.fetchNextPage()
      return
    }
    setVisible((v) => Math.min(v + 40, deskTrades.length))
  }, [useDemo, apiInfinite, deskTrades.length])

  useEffect(() => {
    const el = sentinelRef.current
    const root = listRef.current
    if (!el || !root) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root, rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  const localStats = useMemo(() => computeStatsFromTrades(deskTrades), [deskTrades])

  const winRate = useDemo
    ? (demoStats?.winRatePct ?? localStats?.winRatePct ?? 0)
    : ((apiStats?.winRatePct && Number(apiStats.winRatePct) > 0
        ? Number(apiStats.winRatePct)
        : null) ??
      (pub?.meta?.winRatePct && Number(pub.meta.winRatePct) > 0
        ? Number(pub.meta.winRatePct)
        : null) ??
      localStats?.winRatePct ??
      0)

  const tradeCount = useDemo
    ? (demoStats?.tradeCount ?? localStats?.tradeCount ?? 0)
    : ((apiStats?.tradeCount && apiStats.tradeCount > 0 ? apiStats.tradeCount : null) ??
      (pub?.meta?.tradeCount && pub.meta.tradeCount > 0 ? pub.meta.tradeCount : null) ??
      localStats?.tradeCount ??
      0)

  const avgReturn = useDemo
    ? (localStats?.avgReturnPct ?? 0)
    : ((apiStats?.avgReturnPct && Math.abs(Number(apiStats.avgReturnPct)) > 0
        ? Number(apiStats.avgReturnPct)
        : null) ??
      localStats?.avgReturnPct ??
      0)

  const published = useDemo
    ? tradeCount
    : ((apiStats?.closedTrades && apiStats.closedTrades > 0 ? apiStats.closedTrades : null) ??
      tradeCount)

  const best = useDemo
    ? (localStats?.bestPct ?? 0)
    : ((apiStats?.bestTradeReturnPct != null && Number(apiStats.bestTradeReturnPct) !== 0
        ? Number(apiStats.bestTradeReturnPct)
        : null) ??
      (pub?.analytics.bestTrade?.returnPct != null
        ? Number(pub.analytics.bestTrade.returnPct)
        : null) ??
      localStats?.bestPct ??
      0)

  const worst = useDemo
    ? (localStats?.worstPct ?? 0)
    : ((apiStats?.worstTradeReturnPct != null && Number(apiStats.worstTradeReturnPct) !== 0
        ? Number(apiStats.worstTradeReturnPct)
        : null) ??
      (pub?.analytics.worstTrade?.returnPct != null
        ? Number(pub.analytics.worstTrade.returnPct)
        : null) ??
      localStats?.worstPct ??
      0)

  const avgWin = localStats?.avgWinPct ?? 0
  const avgLoss = localStats?.avgLossPct ?? 0

  const loading = apiInfinite.isLoading && demoLoading && deskTrades.length === 0

  const statCards = [
    { label: 'Win rate', value: `${winRate.toFixed(1)}%` },
    { label: 'Trade count', value: tradeCount.toLocaleString() },
    { label: 'Published trades', value: published.toLocaleString() },
    { label: 'Average return', value: formatPct(avgReturn, 2) },
    { label: 'Avg winning trade', value: formatPct(avgWin, 2) },
    { label: 'Avg losing trade', value: formatPct(avgLoss, 2) },
    { label: 'Best trade', value: formatPct(best, 2) },
    { label: 'Worst trade', value: formatPct(worst, 2) },
  ]

  return (
    <Section
      id="trades"
      eyebrow="Daily trade preview"
      title="The exact trades behind each daily return"
      description="Published desk tickets — pair, direction, entry, exit and return percentage. Newest first."
    >
      <RevealOnScroll>
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-white/10',
            'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-profit opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-profit" />
              </span>
              <p className="text-body-sm font-medium text-fg">Live desk feed</p>
            </div>
            <p className="inline-flex items-center gap-1.5 text-caption text-fg-subtle">
              <Radio className="size-3.5 text-accent-300" aria-hidden />
              Newest first
            </p>
          </div>

          <div className="hidden border-b border-white/[0.05] px-4 py-2 text-[10px] uppercase tracking-wide text-fg-subtle sm:grid sm:grid-cols-[5.5rem_4.5rem_3.25rem_minmax(0,1fr)_minmax(0,1fr)_4.5rem_4.25rem] sm:gap-3">
            <span>Date</span>
            <span>Pair</span>
            <span>Side</span>
            <span className="text-right">Entry</span>
            <span className="text-right">Exit</span>
            <span className="text-right">Return</span>
            <span className="text-right">Status</span>
          </div>

          <div className="relative h-[320px] sm:h-[360px]">
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : shown.length === 0 ? (
              <p className="grid h-full place-items-center px-6 text-center text-body-sm text-fg-muted">
                No published trades are available right now.
              </p>
            ) : (
              <ul
                ref={listRef}
                className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
              >
                {shown.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
                <div ref={sentinelRef} className="py-3 text-center text-[11px] text-fg-subtle">
                  {apiInfinite.isFetchingNextPage || visible < deskTrades.length
                    ? 'Loading more…'
                    : `${shown.length.toLocaleString()} trades loaded`}
                </div>
              </ul>
            )}
          </div>
        </div>
      </RevealOnScroll>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card-fill flex h-full flex-col p-3.5 text-center sm:p-4">
            <p className="text-[11px] text-fg-subtle">{stat.label}</p>
            <p className="mt-1 text-heading-sm tabular-nums text-fg">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.historicalPerformance}>
            Explore Historical Performance
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.historicalPerformance}>
            Browse Performance History
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </Section>
  )
}
