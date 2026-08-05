'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { Percent } from '@/components/common/percent'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { useTrades } from '@/features/trades/hooks'
import { formatDate } from '@/lib/format'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

function TradeRow({
  trade,
}: {
  trade: {
    id: string
    pair: string
    direction: string
    date: string
    entry: string
    exit: string
    returnPct: string
    status: 'WIN' | 'LOSS' | 'FLAT'
  }
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
  const { session } = useSession()
  const { data } = useTrades(undefined, { enabled: Boolean(session) })
  const rows = (data?.items ?? []).slice(0, Math.max(limit, 5)).map((t) => ({
    id: t.id,
    pair: t.pair,
    direction: String(t.direction).includes('SELL') ? 'SELL' : 'BUY',
    date: t.closedAt || t.date,
    entry: t.entryPrice,
    exit: t.exitPrice,
    returnPct: String(t.returnPct).replace('%', ''),
    status: (t.outcome === 'WIN' ? 'WIN' : t.outcome === 'LOSS' ? 'LOSS' : 'FLAT') as
      | 'WIN'
      | 'LOSS'
      | 'FLAT',
  }))

  if (rows.length === 0) {
    return (
      <PremiumEmptyState
        title="No trades yet"
        description="Published desk trades will appear here."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link href={ROUTES.dashboard.trades}>Trade history</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-overline text-accent-300">Recent trades</p>
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.dashboard.trades}>View all</Link>
        </Button>
      </div>
      <ul className="space-y-2.5">
        {rows.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </ul>
    </div>
  )
}
