'use client'

import { Section } from '@/components/common/section'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import {
  formatMarketChangePct,
  marketStatusBadge,
  useMarketQuotes,
} from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

/** Market board — centralized API quotes (no demo drift). */
export function LiveMarketWidget() {
  const { data, isLoading } = useMarketQuotes()
  const rows = data?.quotes ?? []
  const badge = marketStatusBadge(data?.status)

  return (
    <Section
      id="markets"
      eyebrow="Markets"
      title="Major pairs under continuous watch"
      description="Major pairs monitored by the desk — sourced from the platform market-data feed."
    >
      {rows.length === 0 ? (
        <p className="text-body-sm text-fg-subtle">
          {isLoading ? 'Loading market data…' : data?.message || 'Market data unavailable'}
        </p>
      ) : (
        <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const { text, tone } = formatMarketChangePct(row.changePercent)
            return (
              <StaggerItem key={row.symbol}>
                <article className="card-fill group h-full p-4 transition-transform duration-[160ms] hover:-translate-y-1 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-caption text-fg-subtle">{row.type}</p>
                      <p className="mt-1 text-heading-sm text-fg">{row.symbol}</p>
                      <p className="mt-2 text-stat-md tabular-nums text-fg">{row.price}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-caption font-medium tabular-nums',
                        tone === 'up' && 'bg-profit-bg text-profit',
                        tone === 'down' && 'bg-loss-bg text-loss',
                        tone === 'neutral' && 'bg-inset text-fg-subtle',
                      )}
                    >
                      {text}
                    </span>
                  </div>
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
