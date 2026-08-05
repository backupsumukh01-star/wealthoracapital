'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Download, FileDown } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'
import { usePublishedLanding } from '@/features/cms/site'
import { usePerformanceMonthly, usePublicPerformance } from '@/features/performance/hooks'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'
import { HistoricalReturnTimeline } from './historical-return-timeline'

function numericOrNull(value: string | number | null | undefined) {
  if (value == null || value === '' || value === '0' || value === '0.00') return null
  return String(value)
}

/** “Inspect the numbers” — transparency-first proof surface. Published performance API only. */
export function PerformanceProof() {
  const { landing } = usePublishedLanding()
  const { data: pub } = usePublicPerformance()
  const { data: monthly = [] } = usePerformanceMonthly()

  const worst = numericOrNull(pub?.analytics.worstTrade?.returnPct ?? undefined)

  const metrics = [
    {
      label: 'Published months on record',
      value: numericOrNull(monthly.length || null),
      suffix: '',
    },
    {
      label: 'Historical best trade',
      value: numericOrNull(pub?.analytics.bestTrade?.returnPct ?? undefined),
      suffix: '%',
      decimals: 2,
      tone: 'profit' as const,
    },
    {
      label: 'Historical worst trade',
      value: worst ? worst.replace('-', '') : null,
      prefix: worst ? '−' : '',
      suffix: '%',
      decimals: 2,
      tone: 'loss' as const,
    },
    {
      label: 'Avg. monthly performance',
      value: numericOrNull(landing.avgMonthlyReturn),
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Historical win rate',
      value: numericOrNull(landing.winRate) ?? numericOrNull(pub?.analytics.winRate),
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Published trades on record',
      value: numericOrNull(
        (pub?.analytics.closedTrades ?? 0) + (pub?.analytics.openTrades ?? 0) || null,
      ),
      suffix: '',
    },
  ].filter((m): m is typeof m & { value: string } => m.value != null)

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
      {metrics.length > 0 ? (
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
      ) : null}

      <RevealOnScroll className="mx-auto mt-8 max-w-5xl">
        <HistoricalReturnTimeline />
      </RevealOnScroll>

      <RevealOnScroll className="mx-auto mt-8 flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={ROUTES.marketing.performance}>
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
