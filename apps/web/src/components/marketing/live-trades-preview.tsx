'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Download,
  Radio,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import { usePublicTrades, useTradeStats } from '@/features/trades/hooks'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'
import type { Trade } from '@meridian/shared'

const FLAGS: Record<string, string> = {
  IN: '🇮🇳',
  ES: '🇪🇸',
  GB: '🇬🇧',
  PK: '🇵🇰',
  SG: '🇸🇬',
  AE: '🇦🇪',
}

type FeedItem = {
  id: string
  pair: string
  direction: 'BUY' | 'SELL'
  returnPct: string
  amount: string
  name: string
  region: string
  kind: 'profit' | 'loss' | 'deposit' | 'withdrawal'
  secondsAgo: number
}

function buildFeedFromTrades(trades: Trade[]): FeedItem[] {
  if (!trades.length) return []
  return trades.slice(0, 12).map((t, i) => {
    const positive = !String(t.returnPct).startsWith('-')
    const dir = t.direction === 'SELL' ? 'SELL' : 'BUY'
    return {
      id: t.id,
      pair: t.pair,
      direction: dir as 'BUY' | 'SELL',
      returnPct: String(t.returnPct).replace(/^\+/, ''),
      amount: '—',
      name: 'Published trade',
      region: '—',
      kind: (positive ? 'profit' : 'loss') as FeedItem['kind'],
      secondsAgo: (i + 1) * 40,
    }
  })
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
}

const TradeRow = memo(function TradeRow({ trade }: { trade: FeedItem }) {
  const positive = trade.kind === 'profit' || trade.kind === 'deposit'
  const Icon =
    trade.kind === 'withdrawal' || trade.kind === 'loss' ? ArrowUpFromLine : ArrowDownToLine
  const timeLabel =
    trade.secondsAgo < 60
      ? `${trade.secondsAgo} sec ago`
      : `${Math.floor(trade.secondsAgo / 60)} min ago`

  return (
    <li
      className={cn(
        'group flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.05] px-3',
        'transition-[background-color,box-shadow] duration-300 ease-in-out',
        'hover:bg-white/[0.03] hover:shadow-[0_0_24px_-8px_rgba(52,211,153,0.35)]',
        'sm:h-[3.75rem] sm:gap-3 sm:px-4',
      )}
    >
      <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-fg backdrop-blur-sm">
        {initials(trade.name)}
        <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none" aria-hidden>
          {FLAGS[trade.region] ?? '🌍'}
        </span>
      </span>

      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg',
          positive ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-medium text-fg">{trade.pair}</span>
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase',
              trade.direction === 'BUY'
                ? 'bg-accent-500/15 text-accent-200'
                : 'bg-raised text-fg-muted',
            )}
          >
            {trade.direction}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
          {trade.name} · <Money value={trade.amount} size="sm" className="text-[11px] text-fg-muted" />
        </p>
      </div>

      <div className="shrink-0 text-right">
        <Percent
          value={trade.returnPct}
          className={cn('text-[13px] font-medium', positive ? 'text-profit' : 'text-loss')}
        />
        <p className="mt-0.5 text-[10px] text-fg-subtle">{timeLabel}</p>
      </div>
    </li>
  )
})

/** Fixed-height live desk feed — published trades from the public trade API. */
export function LiveTradesPreview() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { data: trades = [], isSuccess } = usePublicTrades()
  const { data: stats } = useTradeStats()
  const feed = useMemo(() => buildFeedFromTrades(trades), [trades])
  const loop = useMemo(() => (feed.length ? [...feed, ...feed] : []), [feed])

  const statCards = [
    { label: 'Win rate', value: stats?.winRatePct ? `${stats.winRatePct}%` : '—' },
    { label: 'Trade count', value: stats ? String(stats.tradeCount) : '—' },
    { label: 'Avg return', value: stats?.avgReturnPct ? `${stats.avgReturnPct}%` : '—' },
    {
      label: 'Published',
      value: isSuccess ? String(trades.length) : '—',
    },
  ]

  return (
    <Section
      id="trades"
      eyebrow="Daily trade preview"
      title="The exact trades behind each daily return"
      description="Example desk activity — pair, direction, entry, exit and return percentage. Losing trades are shown with the same clarity as winners."
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
              Live feed
            </p>
          </div>

          <div
            className="relative h-[280px] overflow-hidden sm:h-[300px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
            }}
          >
            {feed.length === 0 ? (
              <p className="grid h-full place-items-center px-6 text-center text-body-sm text-fg-muted">
                No published trades yet. Desk activity appears here from the live trade API.
              </p>
            ) : prefersReducedMotion ? (
              <ul className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {feed.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </ul>
            ) : (
              <div className="animate-trade-ticker will-change-transform hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused]">
                <ul className="flex flex-col" aria-hidden>
                  {loop.map((trade, i) => (
                    <TradeRow key={`${trade.id}-${i}`} trade={trade} />
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ul className="sr-only">
            {feed.slice(0, 6).map((trade) => (
              <li key={trade.id}>
                {trade.name} {trade.pair} {trade.direction} {trade.returnPct}%
              </li>
            ))}
          </ul>
        </div>
      </RevealOnScroll>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card-fill p-3.5 text-center sm:p-4">
            <p className="text-[11px] text-fg-subtle">{stat.label}</p>
            <p className="mt-1 text-heading-sm tabular-nums text-fg">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.performance}>
            View complete performance
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.transparency}>
            <Download aria-hidden />
            View reports archive
          </Link>
        </Button>
      </div>
    </Section>
  )
}
