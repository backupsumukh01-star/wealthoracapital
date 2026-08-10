'use client'

import { Section } from '@/components/common/section'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import {
  formatMarketChangePct,
  marketStatusBadge,
  useMarketQuotes,
} from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

/** Pair cards — live prices from centralized market feed (spreads removed as static demo). */
export function ForexPairCards() {
  const { data, isLoading } = useMarketQuotes()
  const pairs = data?.quotes ?? []
  const badge = marketStatusBadge(data?.status)

  return (
    <Section
      id="pairs"
      eyebrow="Instruments"
      title="Pairs the desk actually publishes"
      description="Major FX and select metals / crypto — live quotes from the platform market-data feed."
    >
      {pairs.length === 0 ? (
        <p className="text-body-sm text-fg-subtle">
          {isLoading ? 'Loading market data…' : data?.message || 'Market data unavailable'}
        </p>
      ) : (
        <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map((item) => {
            const { text, tone } = formatMarketChangePct(item.changePercent)
            return (
              <StaggerItem key={item.symbol}>
                <article className="card-fill p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-heading-sm text-fg">{item.symbol}</p>
                      <p className="mt-1 text-caption capitalize text-fg-subtle">{item.type}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-caption font-medium tabular-nums',
                        tone === 'up' && 'bg-profit-bg text-profit',
                        tone === 'down' && 'bg-loss-bg text-loss',
                        tone === 'neutral' && 'bg-inset text-fg-subtle',
                      )}
                    >
                      {text}
                    </span>
                  </div>
                  <p className="mt-4 text-stat-md tabular-nums text-fg">{item.price}</p>
                </article>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      )}
      <p className="mt-4 text-center text-caption text-fg-subtle">
        {badge.label}
        {data?.updatedAt
          ? ` · Updated ${new Date(data.updatedAt).toISOString().slice(11, 19)} UTC`
          : ''}
      </p>
    </Section>
  )
}
