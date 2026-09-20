'use client'

import {
  CandlestickChart,
  Globe2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { CountUp } from '@/components/motion/count-up'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { useLandingLiveStats } from '@/features/landing'
import { cn } from '@/lib/cn'

const ICONS: LucideIcon[] = [Users, Globe2, ShieldCheck, CandlestickChart]

/** Programme counters from landing live-stats / canonical demo — not ledger payouts. */
export function TrustStrip() {
  const { stats } = useLandingLiveStats()
  const metrics = [
    { label: 'Investors', value: stats.investors, suffix: '+', accent: 'emerald' },
    { label: 'Countries supported', value: stats.countries, suffix: '', accent: 'cyan' },
    { label: 'Trading days', value: stats.tradingDays, suffix: '', accent: 'blue' },
    { label: 'Published trades', value: stats.trades, suffix: '', accent: 'amber' },
  ] as const

  return (
    <section className="border-y border-glass-line py-6 sm:py-8" aria-label="Programme counters">
      <div className="container-page min-w-0">
        <div className="section-divider mb-6" />
        <StaggerGroup className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {metrics.map((metric, index) => {
            const Icon = ICONS[index] ?? ShieldCheck
            const numeric = Number.parseFloat(String(metric.value).replace(/,/g, ''))
            return (
              <StaggerItem key={metric.label}>
                <div
                  className={cn(
                    'card-fill flex h-full min-w-0 flex-col gap-2.5 p-3.5 transition-transform duration-[160ms] hover:-translate-y-1 sm:gap-3 sm:p-5',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-[11px] leading-snug text-fg-subtle sm:text-caption">
                      {metric.label}
                    </p>
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                        metric.accent === 'emerald' && 'text-hl-emerald border-hl-emerald/30 bg-hl-emerald/10',
                        metric.accent === 'cyan' && 'text-hl-cyan border-hl-cyan/30 bg-hl-cyan/10',
                        metric.accent === 'blue' && 'text-hl-blue border-hl-blue/30 bg-hl-blue/10',
                        metric.accent === 'amber' && 'text-hl-amber border-hl-amber/30 bg-hl-amber/10',
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                  </div>
                  <p className="text-stat-md break-words text-fg sm:text-stat-lg">
                    {Number.isFinite(numeric) ? (
                      <CountUp value={String(numeric)} suffix={metric.suffix} decimals={0} />
                    ) : (
                      <span className="tabular-nums">{metric.value}</span>
                    )}
                  </p>
                  <div className="mt-auto h-1 overflow-hidden rounded-full bg-hover">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        metric.accent === 'emerald' && 'bg-hl-emerald',
                        metric.accent === 'cyan' && 'bg-hl-cyan',
                        metric.accent === 'blue' && 'bg-hl-blue',
                        metric.accent === 'amber' && 'bg-hl-amber',
                      )}
                      style={{ width: `${55 + index * 10}%` }}
                    />
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}
