'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Download, FileDown } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'
import { useLandingLiveStats, useLandingMonthlySeries } from '@/features/landing'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'
import { HistoricalReturnTimeline } from './historical-return-timeline'

/** “Inspect the numbers” — transparency-first proof surface. Live API + demo dataset. */
export function PerformanceProof() {
  const { stats } = useLandingLiveStats()
  const { data: monthly = [] } = useLandingMonthlySeries()

  const metrics = [
    {
      label: 'Published months on record',
      value: String(monthly.length || stats.monthCount),
      suffix: '',
    },
    {
      label: 'Historical best trade',
      value: stats.bestDay,
      suffix: '%',
      decimals: 1,
      tone: 'profit' as const,
    },
    {
      label: 'Historical worst trade',
      value: stats.worstDayAbs,
      prefix: '−',
      suffix: '%',
      decimals: 1,
      tone: 'loss' as const,
    },
    {
      label: 'Avg. monthly performance',
      value: stats.avgMonthlyReturn,
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Historical win rate',
      value: stats.winRate,
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Published trades on record',
      value: stats.trades,
      suffix: '',
    },
  ]

  return (
    <Section
      id="proof"
      eyebrow="Performance proof"
      title={
        <>
          Don&apos;t trust marketing.
          <span className="text-gradient block">Inspect the numbers.</span>
        </>
      }
      description="Verification tools investors use — filters, exports, and the same tape pattern you reconcile in-product."
      centered
      backdrop="grid"
    >
      <StaggerGroup className="mx-auto grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map((m) => (
          <StaggerItem key={m.label}>
            <article className="card-fill h-full p-4 text-center sm:p-5">
              <p className="text-[11px] leading-snug text-fg-subtle sm:text-caption">{m.label}</p>
              <p
                className={cn(
                  'text-stat-md mt-2 tabular-nums sm:text-stat-lg',
                  m.tone === 'profit' && 'text-profit',
                  m.tone === 'loss' && 'text-loss',
                  !m.tone && 'text-fg',
                )}
              >
                <CountUp
                  value={m.value}
                  prefix={'prefix' in m ? m.prefix : ''}
                  suffix={m.suffix}
                  decimals={'decimals' in m ? m.decimals ?? 0 : 0}
                />
              </p>
            </article>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <RevealOnScroll className="mx-auto mt-8 max-w-5xl">
        <HistoricalReturnTimeline />
      </RevealOnScroll>

      <RevealOnScroll className="mx-auto mt-8 flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.historicalPerformance}>
            View complete performance
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.transparency}>
            <Download aria-hidden />
            Download history
          </Link>
        </Button>
        <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.transparency}>
            <FileDown aria-hidden />
            CSV / PDF export
          </Link>
        </Button>
      </RevealOnScroll>

      <HistoricalNote className="mx-auto mt-6 max-w-2xl text-center" />
    </Section>
  )
}
