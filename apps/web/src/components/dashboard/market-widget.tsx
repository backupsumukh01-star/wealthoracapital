'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { MarketClocks } from '@/components/dashboard/market-clocks'
import {
  formatMarketChangePct,
  marketStatusBadge,
  useMarketQuotes,
} from '@/features/markets/hooks'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

function MarketRow({
  symbol,
  price,
  changePct,
  delay,
}: {
  symbol: string
  price: string
  changePct: string
  delay: number
}) {
  const { text, tone } = formatMarketChangePct(changePct)

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: delay * 0.05, duration: 0.35 }}
      className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-hover/40"
    >
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-fg">{symbol}</p>
        <p className="tabular-nums text-caption text-fg-muted">{price}</p>
      </div>
      <span
        className={cn(
          'w-14 text-right text-caption font-medium tabular-nums',
          tone === 'up' && 'text-profit',
          tone === 'down' && 'text-loss',
          tone === 'neutral' && 'text-fg-subtle',
        )}
      >
        {text}
      </span>
    </motion.li>
  )
}

/** Investor dashboard markets — same centralized quotes as public ticker. */
export function MarketWidget() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [pulse, setPulse] = useState(true)
  const { data, isLoading } = useMarketQuotes()
  const rows = (data?.quotes ?? []).slice(0, 6)
  const badge = marketStatusBadge(data?.status)

  useEffect(() => {
    if (prefersReducedMotion || !badge.live) return
    const id = window.setInterval(() => setPulse((p) => !p), 1600)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion, badge.live])

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Markets</p>
          <p className="mt-1 text-caption text-fg-subtle">Desk watchlist</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
            'text-[10px] font-semibold uppercase tracking-wide',
            badge.live
              ? 'border-profit/30 bg-profit/10 text-profit'
              : data?.status === 'DELAYED'
                ? 'border-warning/30 bg-warning/10 text-warning'
                : 'border-line bg-inset/60 text-fg-subtle',
          )}
        >
          {badge.live ? (
            <span
              className={cn(
                'size-1.5 rounded-full bg-profit transition-opacity',
                pulse ? 'opacity-100' : 'opacity-40',
              )}
              aria-hidden
            />
          ) : null}
          {badge.label}
        </span>
      </div>

      <MarketClocks className="mt-4 border-b border-line/60 pb-4" />

      {isLoading && rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading markets…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">
          {data?.message || 'Market data unavailable'}
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {rows.map((m, i) => (
            <MarketRow
              key={m.symbol}
              symbol={m.symbol}
              price={m.price}
              changePct={m.changePercent}
              delay={i}
            />
          ))}
        </ul>
      )}
      {data?.updatedAt && rows.length > 0 ? (
        <p className="mt-3 text-[10px] tabular-nums text-fg-subtle">
          Updated {new Date(data.updatedAt).toISOString().slice(11, 19)} UTC
        </p>
      ) : null}
    </div>
  )
}
