'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Download } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import { usePublishedLanding } from '@/features/cms/site'
import { usePerformanceMonthly, usePublicPerformance } from '@/features/performance/hooks'

import {
  MonthlyPerformanceChart,
  MonthlyPerformanceTimeline,
} from './monthly-performance-chart'

export function PerformanceShowcase({
  showPageLinks = true,
}: {
  showPageLinks?: boolean
}) {
  const { landing } = usePublishedLanding()
  const { data: pub } = usePublicPerformance()
  const { data: monthly = [] } = usePerformanceMonthly()
  const yearly: Array<{ year: string; returnPct: number; profitLabel: string }> = []
  const winRate = landing.winRate || pub?.analytics.winRate || ''
  const bestMonth =
    monthly.length > 0
      ? Math.max(...monthly.map((m) => Number.parseFloat(String(m.returnPct)) || 0)).toFixed(1)
      : ''

  return (
    <Section
      id="performance"
      eyebrow="Performance"
      title="Track record you can inspect"
      description="Published monthly and yearly results. Past performance does not guarantee future results."
      backdrop="glow"
    >
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
                { label: 'Win rate', value: winRate, suffix: '%', color: 'text-hl-emerald' },
                { label: 'Best month', value: bestMonth, suffix: '%', color: 'text-hl-cyan' },
              ].map((w) => (
                <div key={w.label} className="card-fill p-4">
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
              <ul className="mt-4 space-y-2.5">
                {yearly.map((row) => (
                  <li
                    key={row.year}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-inset/40 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-fg">{row.year}</p>
                      <p className="truncate text-caption text-fg-subtle">{row.profitLabel}</p>
                    </div>
                    <p className="shrink-0 text-heading-sm tabular-nums text-profit">
                      +{row.returnPct}%
                    </p>
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
            <Link href={ROUTES.marketing.performance}>
              View full performance
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="md" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.transparency}>
              <Download aria-hidden />
            View reports archive
          </Link>
          </Button>
        </RevealOnScroll>
      ) : null}
    </Section>
  )
}
