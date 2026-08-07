'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import {
  useLandingLiveStats,
  useLandingMonthlySeries,
  useLandingYearlySeries,
} from '@/features/landing'
import { cn } from '@/lib/cn'

import {
  MonthlyPerformanceChart,
  MonthlyPerformanceTimeline,
} from './monthly-performance-chart'

export function PerformanceShowcase({
  showPageLinks = true,
}: {
  showPageLinks?: boolean
}) {
  const { stats } = useLandingLiveStats()
  const { data: monthly = [] } = useLandingMonthlySeries()
  const yearly = useLandingYearlySeries()
  const liveBest = monthly.map((m) => m.returnPct).filter((v) => Math.abs(v) > 0.0001)
  const bestMonth =
    liveBest.length > 0 ? Math.max(...liveBest).toFixed(1) : stats.bestDay

  return (
    <Section
      id="performance"
      eyebrow="Performance"
      title="Track record you can inspect"
      description="Published monthly and yearly results. Past performance does not guarantee future results."
      backdrop="glow"
    >
      <RevealOnScroll>
        <div className="mb-4 grid grid-cols-3 gap-3 sm:mb-5">
          {[
            { label: 'Years', value: stats.yearsOfPerformance, suffix: '' },
            { label: 'Trading days', value: stats.tradingDays, suffix: '' },
            { label: 'Trades', value: stats.trades, suffix: '' },
          ].map((kpi) => (
            <div key={kpi.label} className="card-fill flex h-full flex-col p-3 text-center sm:p-4">
              <p className="text-caption text-fg-subtle">{kpi.label}</p>
              <p className="text-stat-md mt-1 tabular-nums text-fg sm:text-stat-lg">
                <CountUp value={kpi.value} suffix={kpi.suffix} decimals={0} />
              </p>
            </div>
          ))}
        </div>
      </RevealOnScroll>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.45fr_1fr] lg:gap-5">
        <RevealOnScroll className="min-w-0">
          <div className="card-fill h-full min-w-0 overflow-hidden p-4 sm:p-6 lg:p-8">
            <MonthlyPerformanceChart />
          </div>
        </RevealOnScroll>

        <div className="grid min-w-0 gap-4">
          <RevealOnScroll delay={0.06}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Win rate', value: stats.winRate, suffix: '%', color: 'text-hl-emerald' },
                { label: 'Best month', value: bestMonth, suffix: '%', color: 'text-hl-cyan' },
              ].map((w) => (
                <div key={w.label} className="card-fill flex h-full flex-col p-4">
                  <p className="text-caption text-fg-subtle">{w.label}</p>
                  <p className={`text-stat-md mt-2 tabular-nums ${w.color}`}>
                    <CountUp value={w.value} decimals={1} suffix={w.suffix} />
                  </p>
                </div>
              ))}
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.08} className="min-w-0">
            <div className="card-fill h-full min-w-0 p-5 sm:p-6">
              <h3 className="text-heading-sm text-fg">Yearly returns</h3>
              <ul className="mt-4 max-h-[22rem] space-y-2.5 overflow-y-auto overscroll-contain pr-1">
                {yearly.map((row) => (
                  <li
                    key={row.year}
                    className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-inset/40 px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="text-body-sm font-medium text-fg">{row.year}</p>
                      <p
                        className={cn(
                          'shrink-0 text-heading-sm tabular-nums',
                          row.returnPct >= 0 ? 'text-profit' : 'text-loss',
                        )}
                      >
                        {row.returnPct >= 0 ? '+' : ''}
                        {row.returnPct}%
                      </p>
                    </div>
                    <p className="text-caption text-fg-subtle">
                      {row.tradeCount != null ? `${row.tradeCount.toLocaleString()} trades` : null}
                      {row.tradingDays != null ? ` · ${row.tradingDays} days` : null}
                      {row.winRatePct ? ` · ${row.winRatePct}% win` : null}
                    </p>
                    <p className="truncate text-caption text-fg-muted">{row.profitLabel}</p>
                  </li>
                ))}
              </ul>
            </div>
          </RevealOnScroll>
        </div>
      </div>

      <div className="mt-4 min-w-0 lg:mt-5">
        <RevealOnScroll>
          <MonthlyPerformanceTimeline />
        </RevealOnScroll>
      </div>

      {showPageLinks ? (
        <RevealOnScroll className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
          <Button asChild size="md" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.historicalPerformance}>
              Explore Historical Performance
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="md" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.historicalPerformance}>
              Browse Performance History
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </RevealOnScroll>
      ) : null}
    </Section>
  )
}
