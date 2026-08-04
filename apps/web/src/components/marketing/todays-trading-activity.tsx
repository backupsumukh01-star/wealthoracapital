'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CandlestickChart,
  Radio,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import { LIVE_ACTIVITY, LIVE_TRADE_POOL } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'

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

function buildFeed(): FeedItem[] {
  // Long enough for a seamless -50% loop without layout growth.
  const rounds = 3
  const items: FeedItem[] = []
  for (let r = 0; r < rounds; r += 1) {
    LIVE_TRADE_POOL.forEach((t, i) => {
      const activity = LIVE_ACTIVITY[(i + r) % LIVE_ACTIVITY.length]!
      const positive = !t.returnPct.startsWith('-')
      const depositLike = activity.type === 'deposit' && positive && i % 4 === 0
      const withdrawLike = activity.type === 'withdrawal' && !positive
      items.push({
        id: `trade-${r}-${i}`,
        pair: t.pair,
        direction: t.direction,
        returnPct: t.returnPct,
        amount: activity.amount,
        name: activity.name,
        region: activity.region,
        kind: depositLike
          ? 'deposit'
          : withdrawLike
            ? 'withdrawal'
            : positive
              ? 'profit'
              : 'loss',
        secondsAgo: 6 + ((i + r * 3) % 48),
      })
    })
  }
  return items
}

const FEED = buildFeed()

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
        'bg-transparent transition-[background-color,box-shadow] duration-300 ease-in-out',
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

/** Fixed-height vertical ticker — page height never changes (no CLS). */
const RecentTradesTicker = memo(function RecentTradesTicker({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const loop = useMemo(() => [...FEED, ...FEED], [])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/10',
        'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <CandlestickChart className="size-4 text-accent-300" aria-hidden />
          <p className="text-body-sm font-medium text-fg">Recent published trades</p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-caption text-fg-subtle">
          <Radio className="size-3.5 text-accent-300" aria-hidden />
          Live feed
        </p>
      </div>

      {/* Fixed viewport — never resizes; scrollbar hidden */}
      <div
        className="relative h-[280px] overflow-hidden sm:h-[300px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
        }}
      >
        {prefersReducedMotion ? (
          <ul className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FEED.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </ul>
        ) : (
          <div
            className="animate-trade-ticker will-change-transform hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused]"
            aria-hidden
          >
            <ul className="flex flex-col">
              {loop.map((trade, i) => (
                <TradeRow key={`${trade.id}-${i}`} trade={trade} />
              ))}
            </ul>
          </div>
        )}
      </div>

      <ul className="sr-only">
        {FEED.slice(0, 8).map((trade) => (
          <li key={trade.id}>
            {trade.name} {trade.pair} {trade.direction} {trade.returnPct}% · {trade.secondsAgo} sec
            ago
          </li>
        ))}
      </ul>
    </div>
  )
})

/** Dashboard-style demo of today's published desk activity. */
export function TodaysTradingActivity() {
  const prefersReducedMotion = usePrefersReducedMotion()

  const kpis = [
    { label: "Today's published return", value: '0.42', suffix: '%', tone: 'text-profit' },
    { label: 'Historical win rate', value: '78.6', suffix: '%', tone: 'text-fg' },
    { label: 'Best pair today', value: 'EUR/USD', suffix: '', tone: 'text-fg', plain: true },
    { label: "Today's volume", value: '42.6', prefix: '$', suffix: 'M', tone: 'text-fg' },
    { label: 'Open positions', value: '6', suffix: '', tone: 'text-fg' },
    { label: 'Closed today', value: '14', suffix: '', tone: 'text-fg' },
  ]

  return (
    <Section
      id="trades"
      eyebrow="Today's trading activity"
      title="Published desk activity"
      description="Recent published tickets and session KPIs from the trading desk."
    >
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="card-fill p-3.5 sm:p-4">
            <p className="text-[11px] leading-snug text-fg-subtle">{k.label}</p>
            <p className={cn('mt-1.5 text-heading-sm tabular-nums sm:text-heading-md', k.tone)}>
              {'plain' in k && k.plain ? (
                k.value
              ) : (
                <CountUp
                  value={k.value}
                  prefix={'prefix' in k ? (k.prefix as string) : ''}
                  suffix={k.suffix}
                  decimals={k.value.includes('.') ? 2 : 0}
                />
              )}
            </p>
          </div>
        ))}
      </div>

      <RevealOnScroll className="mt-5 sm:mt-6">
        <RecentTradesTicker prefersReducedMotion={prefersReducedMotion} />
      </RevealOnScroll>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.performance}>
            View complete performance
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.transparency}>Download history</Link>
        </Button>
      </div>
      <HistoricalNote className="mt-5 text-center" />
    </Section>
  )
}
