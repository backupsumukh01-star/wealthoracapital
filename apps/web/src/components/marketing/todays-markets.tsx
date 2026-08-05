'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Trade } from '@meridian/shared'

import { Section } from '@/components/common/section'
import { usePublicTrades } from '@/features/trades/hooks'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'

type Row = { pair: string; price: string; change: string; tag: string }

const TAGS: Record<string, string> = {
  'EUR/USD': 'Forex',
  'GBP/USD': 'Forex',
  'USD/JPY': 'Forex',
  'XAU/USD': 'Gold',
  'BTC/USD': 'Crypto',
  'ETH/USD': 'Crypto',
}

function latestPerPair(trades: Trade[]): Row[] {
  const seen = new Map<string, Trade>()
  for (const t of trades) {
    if (!seen.has(t.pair)) seen.set(t.pair, t)
  }
  return Array.from(seen.values()).map((t) => ({
    pair: t.pair,
    price: t.exitPrice,
    change: String(t.returnPct).replace(/^\+/, ''),
    tag: TAGS[t.pair] ?? 'Market',
  }))
}

/** Published trade board for today's watched pairs — from the public trade API. */
export function TodaysMarkets() {
  const { data: trades = [] } = usePublicTrades()
  const rows = useMemo(() => latestPerPair(trades), [trades])

  if (rows.length === 0) return null

  return (
    <Section
      id="markets-today"
      eyebrow="Today's markets"
      title="Market context"
      description="Recently published trades for the pairs the desk monitors today."
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
            </motion.article>
          )
        })}
      </div>
      <HistoricalNote className="mt-5 text-center" />
    </Section>
  )
}
