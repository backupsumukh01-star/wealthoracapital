'use client'

import { useEffect, useMemo, useState } from 'react'

import { Section } from '@/components/common/section'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { FOREX_TICKER } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { MiniSparkline } from './mini-sparkline'

type MarketRow = {
  pair: string
  price: string
  change: string
  spark: number[]
}

function seedSpark(seed: number, up: boolean) {
  let v = 50 + (seed % 20)
  return Array.from({ length: 14 }, (_, i) => {
    v += (Math.sin(seed + i) + (up ? 0.35 : -0.35)) * 2.2
    return v
  })
}

function driftRow(row: MarketRow): MarketRow {
  const raw = Number(row.price.replace(/,/g, ''))
  const mag = raw >= 1000 ? raw * 0.0012 : raw >= 100 ? 0.22 : 0.0014
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
  const spark = [...row.spark.slice(1), row.spark[row.spark.length - 1]! + (up ? 1.2 : -1.2)]
  return { pair: row.pair, price, change, spark }
}

/** Premium market board with live-feeling demo prices and sparklines. */
export function LiveMarketWidget() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const initial = useMemo<MarketRow[]>(
    () =>
      FOREX_TICKER.map((t, i) => ({
        pair: t.pair,
        price: t.price,
        change: t.change,
        spark: seedSpark(i * 11 + 3, !t.change.startsWith('-')),
      })),
    [],
  )
  const [rows, setRows] = useState(initial)

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => setRows((prev) => prev.map(driftRow)), 3200)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  return (
    <Section
      id="markets"
      eyebrow="Live markets"
      title="Major pairs under continuous watch"
      description="Major pairs monitored by the desk — context for how Growzy presents market coverage."
    >
      <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const up = !row.change.startsWith('-')
          return (
            <StaggerItem key={row.pair}>
              <article className="card-fill group h-full p-4 transition-transform duration-[160ms] hover:-translate-y-1 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-heading-sm text-fg">{row.pair}</p>
                    <p className="mt-1 break-all text-stat-md tabular-nums text-fg">{row.price}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-caption font-medium tabular-nums',
                      up ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss',
                    )}
                  >
                    {up ? '+' : ''}
                    {row.change}%
                  </span>
                </div>
                <div className="mt-3 sm:mt-4">
                  <MiniSparkline values={row.spark} positive={up} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-fg-subtle">24h move · demo</p>
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      up ? 'bg-profit animate-pulse' : 'bg-loss animate-pulse',
                    )}
                  />
                </div>
              </article>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </Section>
  )
}
