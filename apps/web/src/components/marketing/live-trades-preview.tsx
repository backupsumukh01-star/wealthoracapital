'use client'

import { memo, useMemo, useRef } from 'react'
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
import { useNearViewport } from '@/hooks/use-near-viewport'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useDemoDashboardStats, useDemoTradesPreview } from '@/lib/demo-backtest'
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

const AUTO_SCROLL_ROWS = 48

/** Public desk feed — canonical demo blotter when present, live API only as fallback. */
export function LiveTradesPreview() {
  const rootRef = useRef<HTMLDivElement>(null)
  const near = useNearViewport(rootRef, { rootMargin: '320px 0px' })
  const prefersReducedMotion = usePrefersReducedMotion()

  const apiInfinite = usePublicTradesInfinite({ limit: 40, enabled: near })
  const { data: apiStats } = usePublicTradeStats({ enabled: near })
  const { data: pub } = usePublicPerformance({ enabled: near })
  const { data: demoTrades = [], isLoading: demoLoading } = useDemoTradesPreview({
    enabled: near,
  })
  const { data: demoStats } = useDemoDashboardStats()

  const apiTrades = useMemo(
    () => apiInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [apiInfinite.data],
  )

  const demoOk = demoHistoryUsable(demoStats)
  const useDemo = demoOk || (!apiInfinite.isLoading && apiTrades.length === 0)

  const deskTrades = useMemo(() => {
    if (!near) return []
    if (useDemo) {
      return demoTrades.map(toDeskFromDemo)
    }
    return apiTrades.map((t) => toDeskFromApi(t as Trade & { status?: string }))
  }, [near, useDemo, apiTrades, demoTrades])

  const feed = useMemo(() => deskTrades.slice(0, AUTO_SCROLL_ROWS), [deskTrades])
  const loop = useMemo(() => [...feed, ...feed], [feed])
  const durationSec = Math.max(36, feed.length * 1.8)

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

  const loading = !near || ((apiInfinite.isLoading || demoLoading) && deskTrades.length === 0)

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
    <div ref={rootRef}>
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

            <div
              className="relative h-[320px] overflow-hidden sm:h-[360px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                maskImage:
                  'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
              }}
            >
              {loading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : feed.length === 0 ? (
                <p className="grid h-full place-items-center px-6 text-center text-body-sm text-fg-muted">
                  No published trades are available right now.
                </p>
              ) : prefersReducedMotion ? (
                <ul className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                  {feed.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))}
                </ul>
              ) : (
                <div
                  className="will-change-transform hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused]"
                  style={{ animation: `trade-ticker ${durationSec}s linear infinite` }}
                  data-auto-scroll
                  aria-hidden
                  onTouchStart={(e) => {
                    ;(e.currentTarget as HTMLElement).style.animationPlayState = 'paused'
                  }}
                  onTouchEnd={(e) => {
                    ;(e.currentTarget as HTMLElement).style.animationPlayState = ''
                  }}
                >
                  <ul className="flex flex-col">
                    {loop.map((trade, i) => (
                      <TradeRow key={`${trade.id}-${i}`} trade={trade} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </RevealOnScroll>

        <ul className="sr-only">
          {feed.slice(0, 12).map((trade) => (
            <li key={trade.id}>
              {trade.date} {trade.pair} {trade.direction} {formatPct(trade.returnPct, 2)}
            </li>
          ))}
        </ul>

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
    </div>
  )
}
