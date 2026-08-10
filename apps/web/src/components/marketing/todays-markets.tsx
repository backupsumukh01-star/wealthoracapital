'use client'

import { motion } from 'framer-motion'

import { Section } from '@/components/common/section'
import {
  formatMarketChangePct,
  marketStatusBadge,
  useMarketQuotes,
} from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'

const TAGS: Record<string, string> = {
  'EUR/USD': 'Forex',
  'GBP/USD': 'Forex',
  'USD/JPY': 'Forex',
  'AUD/USD': 'Forex',
  'NZD/USD': 'Forex',
  'XAU/USD': 'Gold',
  'BTC/USD': 'Crypto',
  'ETH/USD': 'Crypto',
}

/** Market board — same centralized quotes as the header ticker. */
export function TodaysMarkets() {
  const { data, isLoading } = useMarketQuotes()
  const rows = data?.quotes ?? []
  const badge = marketStatusBadge(data?.status)

  return (
    <Section
      id="markets-today"
      eyebrow="Today's markets"
      title="Market context"
      description="Live desk watchlist quotes from the platform market-data feed."
    >
      {rows.length === 0 ? (
        <p className="text-body-sm text-fg-subtle">
          {isLoading ? 'Loading market data…' : data?.message || 'Market data unavailable'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, i) => {
            const { text, tone } = formatMarketChangePct(row.changePercent)
            return (
              <motion.article
                key={row.symbol}
                className="card-fill p-4"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-heading-sm text-fg">{row.symbol}</p>
                      <span className="rounded-full border border-line bg-inset/60 px-2 py-0.5 text-[10px] text-fg-subtle">
                        {TAGS[row.symbol] ?? row.type}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-stat-md tabular-nums text-fg">{row.price}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-1 text-caption font-medium tabular-nums',
                      tone === 'up' && 'bg-profit-bg text-profit',
                      tone === 'down' && 'bg-loss-bg text-loss',
                      tone === 'neutral' && 'bg-inset text-fg-subtle',
                    )}
                  >
                    {text}
                  </span>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}
      <p className="mt-4 text-center text-caption text-fg-subtle">
        {badge.label}
        {data?.updatedAt
          ? ` · Updated ${new Date(data.updatedAt).toISOString().slice(11, 19)} UTC`
          : ''}
      </p>
      <HistoricalNote className="mt-3 text-center" />
    </Section>
  )
}
