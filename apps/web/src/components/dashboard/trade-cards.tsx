'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { Percent } from '@/components/common/percent'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { RECENT_TRADES } from '@/lib/dashboard-data'
import { formatDate } from '@/lib/format'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

function TradeRow({
  trade,
}: {
  trade: (typeof RECENT_TRADES)[number]
}) {
  const win = trade.status === 'WIN'
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5',
        'border-line/80 bg-inset/35 transition-colors hover:border-accent-800/40 hover:bg-hover/40',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body-sm font-medium text-fg">{trade.pair}</p>
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase',
              trade.direction === 'BUY' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss',
            )}
          >
            {trade.direction}
          </span>
        </div>
        <p className="mt-1 text-caption text-fg-subtle">
          {formatDate(trade.date)} · {trade.entry} → {trade.exit}
        </p>
      </div>
      <div className="text-right">
        <Percent
          value={trade.returnPct}
          showArrow
          className={cn('text-body-sm font-semibold', win ? 'text-profit' : 'text-loss')}
        />
        <p className={cn('text-caption', win ? 'text-profit' : 'text-loss')}>{trade.status}</p>
      </div>
    </li>
  )
}

export function TradeCards({ limit = 5 }: { limit?: number }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const rows = RECENT_TRADES.slice(0, Math.max(limit, 5))

  if (rows.length === 0) {
    return (
      <div className="glass glass-edge rounded-3xl p-5 shadow-e2 sm:p-6">
        <PremiumEmptyState
          title="No trades yet"
          description="Desk fills will appear here once your capital is deployed."
        />
      </div>
    )
  }

  const loop = [...rows, ...rows]

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Recent trades</p>
          <p className="mt-1 text-body-sm text-fg-muted">Desk activity behind your returns</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.dashboard.trades}>View all</Link>
        </Button>
      </div>

      <div className="relative mt-4 h-[280px] overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-[rgb(8_18_28)] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-[rgb(8_18_28)] to-transparent"
        />
        {prefersReducedMotion ? (
          <ul className="space-y-2.5 overflow-y-auto pr-1">
            {rows.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </ul>
        ) : (
          <ul className="animate-trade-ticker space-y-2.5 hover:[animation-play-state:paused]">
            {loop.map((trade, i) => (
              <TradeRow key={`${trade.id}-${i}`} trade={trade} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
