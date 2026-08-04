'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { AnimatedNumber } from '@/components/motion/animated-number'
import { MarketClocks } from '@/components/dashboard/market-clocks'
import { useLiveDrift } from '@/hooks/use-live-drift'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { MARKET_SNAPSHOT } from '@/lib/dashboard-data'
import { cn } from '@/lib/cn'

function MiniSpark({ values, positive }: { values: number[]; positive: boolean }) {
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

function LiveMarketRow({
  symbol,
  price,
  changePct,
  decimals,
  spark,
  delay,
}: {
  symbol: string
  price: string
  changePct: string
  decimals: number
  spark: number[]
  delay: number
}) {
  const base = Number(price)
  const maxDelta =
    decimals >= 4 ? 0.00035 : decimals === 2 ? (base > 1000 ? 0.8 : 0.06) : base > 1000 ? 18 : 2.5
  const live = useLiveDrift(base, {
    intervalMs: 2800 + delay * 400,
    maxDelta,
    decimals,
    startAfterMs: 900 + delay * 200,
  })
  const positive = Number(changePct) >= 0
  const tickUp = live >= base

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
        <p
          className={cn(
            'tabular-nums text-caption transition-colors',
            tickUp ? 'text-profit' : 'text-loss',
          )}
        >
          <AnimatedNumber value={live} decimals={decimals} duration={0.55} />
        </p>
      </div>
      <MiniSpark values={[...spark]} positive={positive} />
      <p
        className={cn(
          'w-14 text-right text-caption font-medium tabular-nums',
          positive ? 'text-profit' : 'text-loss',
        )}
      >
        {positive ? '+' : ''}
        {changePct}%
      </p>
    </motion.li>
  )
}

export function MarketWidget() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [pulse, setPulse] = useState(true)

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

      <ul className="mt-2 space-y-0.5">
        {MARKET_SNAPSHOT.map((m, i) => (
          <LiveMarketRow
            key={m.id}
            symbol={m.symbol}
            price={m.price}
            changePct={m.changePct}
            decimals={m.decimals}
            spark={[...m.spark]}
            delay={i}
          />
        ))}
      </ul>
    </div>
  )
}
