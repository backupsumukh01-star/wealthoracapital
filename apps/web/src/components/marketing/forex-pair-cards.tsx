'use client'

import { Section } from '@/components/common/section'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { cn } from '@/lib/cn'

import { MiniSparkline } from './mini-sparkline'

const PAIRS = [
  {
    pair: 'EUR/USD',
    spread: '0.6',
    change: '0.18',
    spark: [40, 42, 41, 44, 46, 45, 48, 50, 49, 52, 55, 54, 57, 60],
  },
  {
    pair: 'GBP/USD',
    spread: '0.9',
    change: '-0.11',
    spark: [60, 58, 59, 56, 55, 53, 54, 51, 50, 48, 49, 46, 45, 44],
  },
  {
    pair: 'USD/JPY',
    spread: '0.8',
    change: '0.27',
    spark: [30, 32, 31, 35, 36, 38, 37, 40, 42, 41, 44, 46, 45, 48],
  },
  {
    pair: 'XAU/USD',
    spread: '1.4',
    change: '0.41',
    spark: [35, 38, 37, 42, 40, 45, 48, 47, 51, 54, 53, 58, 60, 62],
  },
  {
    pair: 'BTC/USD',
    spread: '12',
    change: '1.05',
    spark: [20, 24, 22, 28, 30, 27, 33, 36, 34, 40, 44, 42, 48, 52],
  },
  {
    pair: 'ETH/USD',
    spread: '1.8',
    change: '-0.52',
    spark: [55, 52, 53, 49, 48, 46, 47, 43, 42, 40, 41, 38, 36, 35],
  },
] as const

/** Animated forex pair cards with spread, change, and tiny charts. */
export function ForexPairCards() {
  return (
    <Section
      id="pairs"
      eyebrow="Instruments"
      title="Pairs the desk actually publishes"
      description="Major FX and select metals / crypto context — illustrative spreads for presentation only."
    >
      <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PAIRS.map((item) => {
          const up = !item.change.startsWith('-')
          return (
            <StaggerItem key={item.pair}>
              <article className="card-fill group p-4 transition-all duration-[160ms] hover:-translate-y-1 hover:shadow-e3 sm:p-5">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent-500/10 blur-2xl transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-heading-sm text-fg">{item.pair}</p>
                    <p className="mt-1 text-caption text-fg-subtle">
                      Spread <span className="tabular-nums text-fg">{item.spread}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-caption font-medium tabular-nums',
                      up ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss',
                    )}
                  >
                    {up ? '+' : ''}
                    {item.change}%
                  </span>
                </div>
                <div className="relative mt-3 sm:mt-4">
                  <MiniSparkline values={[...item.spark]} positive={up} />
                </div>
                <div className="relative mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      up ? 'bg-profit animate-pulse' : 'bg-loss animate-pulse',
                    )}
                  />
                  <span className="text-[11px] text-fg-subtle">
                    {up ? 'Bullish tape' : 'Soft tape'} · demo
                  </span>
                </div>
              </article>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </Section>
  )
}
