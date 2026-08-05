'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { MarketClocks } from '@/components/dashboard/market-clocks'
import { Percent } from '@/components/common/percent'
import { usePublicTrades, useTradePairs, useTradeStats } from '@/features/trades/hooks'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

function MiniSpark({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) {
    return <span className="inline-block h-7 w-16" aria-hidden />
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 64
  const h = 28
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={positive ? '#12D6A0' : '#F87171'}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="opacity-90"
      />
    </svg>
  )
}

function MarketRow({
  symbol,
  price,
  changePct,
  spark,
  delay,
}: {
  symbol: string
  price: string
  changePct: string
  spark: number[]
  delay: number
}) {
  const positive = Number(changePct) >= 0

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
      <MiniSpark values={spark} positive={positive} />
      <Percent
        value={changePct}
        showArrow
        className={cn(
          'w-14 text-right text-caption font-medium tabular-nums',
          positive ? 'text-profit' : 'text-loss',
        )}
      />
    </motion.li>
  )
}

export function MarketWidget() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [pulse, setPulse] = useState(true)
  const { data: trades = [], isLoading: tradesLoading } = usePublicTrades()
  const { data: pairs = [] } = useTradePairs()
  const { data: stats } = useTradeStats()

  const rows = useMemo(() => {
    const byPair = new Map<
      string,
      { symbol: string; price: string; changePct: string; spark: number[] }
    >()

    for (const trade of trades) {
      const existing = byPair.get(trade.pair)
      const pct = Number(trade.returnPct)
      if (!existing) {
        byPair.set(trade.pair, {
          symbol: trade.pair,
          price: trade.exitPrice || trade.entryPrice || '—',
          changePct: String(trade.returnPct),
          spark: Number.isFinite(pct) ? [pct] : [],
        })
      } else {
        existing.spark.push(Number.isFinite(pct) ? pct : 0)
        existing.price = trade.exitPrice || trade.entryPrice || existing.price
        existing.changePct = String(trade.returnPct)
      }
    }

    let list = Array.from(byPair.values())
    if (!list.length && pairs.length) {
      list = pairs.slice(0, 6).map((symbol) => ({
        symbol,
        price: '—',
        changePct: stats?.avgReturnPct ?? '0',
        spark: [],
      }))
    }

    return list.slice(0, 6).map((row) => ({
      ...row,
      spark: row.spark.length >= 2 ? row.spark.slice(-8) : row.spark,
    }))
  }, [pairs, stats?.avgReturnPct, trades])

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => setPulse((p) => !p), 1600)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Markets</p>
          <p className="mt-1 text-caption text-fg-subtle">Desk watchlist</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-profit/30 bg-profit/10 px-2 py-0.5',
            'text-[10px] font-semibold uppercase tracking-wide text-profit',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full bg-profit transition-opacity',
              pulse ? 'opacity-100' : 'opacity-40',
            )}
            aria-hidden
          />
          Live
        </span>
      </div>

      <MarketClocks className="mt-4 border-b border-line/60 pb-4" />

      {tradesLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading markets…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No market pairs published yet.</p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {rows.map((m, i) => (
            <MarketRow
              key={m.symbol}
              symbol={m.symbol}
              price={m.price}
              changePct={m.changePct}
              spark={m.spark}
              delay={i}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
