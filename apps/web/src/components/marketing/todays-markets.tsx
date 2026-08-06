'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { Section } from '@/components/common/section'
import { FOREX_TICKER } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'
import { MiniSparkline } from './mini-sparkline'

type Row = { pair: string; price: string; change: string; spark: number[]; tag: string }

const TAGS: Record<string, string> = {
  'EUR/USD': 'Forex',
  'GBP/USD': 'Forex',
  'USD/JPY': 'Forex',
  'XAU/USD': 'Gold',
  'BTC/USD': 'Crypto',
  'ETH/USD': 'Crypto',
}

function seedSpark(i: number, up: boolean) {
  let v = 40 + i * 3
  return Array.from({ length: 12 }, (_, k) => {
    v += (up ? 0.8 : -0.7) + Math.sin(i + k) * 1.2
    return v
  })
}

/** Compact live-demo market board — Forex, gold, crypto context. */
export function TodaysMarkets() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [rows, setRows] = useState<Row[]>(() =>
    FOREX_TICKER.map((t, i) => ({
      pair: t.pair,
      price: t.price,
      change: t.change,
      spark: seedSpark(i, !t.change.startsWith('-')),
      tag: TAGS[t.pair] ?? 'Market',
    })),
  )

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => {
      setRows((prev) =>
        prev.map((row) => {
          const raw = Number(row.price.replace(/,/g, ''))
          const mag = raw >= 1000 ? raw * 0.0008 : raw >= 100 ? 0.15 : 0.001
          const delta = (Math.random() - 0.5) * mag
          const next = Math.max(0.0001, raw + delta)
          const change = ((delta / raw) * 100).toFixed(2)
          const up = !change.startsWith('-')
          const price =
            raw >= 1000
              ? next.toLocaleString('en-US', { maximumFractionDigits: 1 })
              : raw >= 100
                ? next.toFixed(2)
                : next.toFixed(4)
          return {
            ...row,
            price,
            change,
            spark: [...row.spark.slice(1), row.spark.at(-1)! + (up ? 1 : -1)],
          }
        }),
      )
    }, 3400)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  return (
    <Section
      id="markets-today"
      eyebrow="Today's markets"
      title="Market context"
      description="Indicative quotes for major pairs the desk monitors today."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, i) => {
          const up = !row.change.startsWith('-')
          return (
            <motion.article
              key={row.pair}
              className="card-fill p-4"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-heading-sm text-fg">{row.pair}</p>
                    <span className="rounded-full border border-line bg-inset/60 px-2 py-0.5 text-[10px] text-fg-subtle">
                      {row.tag}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-stat-md tabular-nums text-fg">{row.price}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-1 text-caption font-medium tabular-nums',
                    up ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss',
                  )}
                >
                  {up ? '+' : ''}
                  {row.change}%
                </span>
              </div>
              <MiniSparkline values={row.spark} positive={up} className="mt-3 h-9" />
            </motion.article>
          )
        })}
      </div>
      <HistoricalNote className="mt-5 text-center" />
    </Section>
  )
}
