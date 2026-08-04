'use client'

import { motion } from 'framer-motion'
import {
  CalendarDays,
  ChartNoAxesCombined,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { HistoricalNote } from './historical-note'
import { MiniSparkline } from './mini-sparkline'
import { useAdminOs } from '@/providers/admin-os-provider'

const HIGHLIGHT_META: {
  key: string
  label: string
  icon: LucideIcon
  spark: number[]
  positive?: boolean
  accent: string
  decimals?: number
  suffix?: string
  prefix?: string
}[] = [
  {
    key: 'avg',
    label: 'Average monthly return',
    icon: TrendingUp,
    spark: [32, 41, 20, 58, 29, 64, 48, 71, 36, 55, 82, 69],
    positive: true,
    accent: 'text-accent-300 bg-accent-500/10 border-accent-700/40',
    decimals: 1,
    suffix: '%',
  },
  {
    key: 'win',
    label: 'Win rate',
    icon: Target,
    spark: [50, 52, 51, 55, 54, 58, 57, 60, 59, 62, 61, 64],
    positive: true,
    accent: 'text-hl-amber bg-hl-amber/10 border-hl-amber/30',
    decimals: 1,
    suffix: '%',
  },
  {
    key: 'best',
    label: 'Best day',
    icon: Trophy,
    spark: [30, 32, 28, 40, 36, 48, 44, 58, 52, 70, 66, 82],
    positive: true,
    accent: 'text-hl-emerald bg-hl-emerald/10 border-hl-emerald/30',
    decimals: 1,
    suffix: '%',
  },
  {
    key: 'worst',
    label: 'Worst day',
    icon: TrendingDown,
    spark: [60, 55, 58, 50, 48, 52, 45, 42, 46, 40, 44, 42],
    positive: false,
    accent: 'text-hl-cyan bg-hl-cyan/10 border-hl-cyan/30',
    decimals: 1,
    suffix: '%',
  },
  {
    key: 'yearly',
    label: 'Annual performance',
    icon: ChartNoAxesCombined,
    spark: [25, 30, 28, 45, 40, 55, 50, 68, 60, 75, 70, 82],
    positive: true,
    accent: 'text-hl-violet bg-hl-violet/10 border-hl-violet/30',
    decimals: 1,
    suffix: '%',
  },
  {
    key: 'investors',
    label: 'Global investors',
    icon: CalendarDays,
    spark: [20, 28, 26, 34, 40, 38, 46, 52, 50, 58, 62, 60],
    accent: 'text-hl-blue bg-hl-blue/10 border-hl-blue/30',
  },
]

/** Premium performance preview cards — values from published landing + performance CMS. */
export function PerformanceHighlights() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { publishedLanding: cms, state } = useAdminOs()

  const highlights = HIGHLIGHT_META.map((meta) => {
    let value = '0'
    if (meta.key === 'avg') value = cms.avgMonthlyReturn || '4.8'
    else if (meta.key === 'win') value = cms.winRate || state.performance.winningPct || '81.2'
    else if (meta.key === 'best') value = cms.bestDay || state.performance.bestDay || '8.2'
    else if (meta.key === 'worst') value = (state.performance.worstDay || '4.2').replace('-', '')
    else if (meta.key === 'yearly') value = state.performance.yearlyReturn || '54.8'
    else if (meta.key === 'investors') value = cms.investorCount || '312'
    return { ...meta, value }
  })

  return (
    <Section
      id="highlights"
      eyebrow="Performance archive"
      title="Historical performance highlights"
      description="Figures from the published archive — for inspection, not prediction."
    >
      <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map((item, index) => {
          const Icon = item.icon
          return (
            <StaggerItem key={item.label}>
              <article className="card-fill group h-full p-4 transition-transform duration-[160ms] hover:-translate-y-1 sm:p-5">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-accent-500/10 blur-3xl opacity-70 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <p className="text-caption max-w-[70%] leading-snug text-fg-subtle">{item.label}</p>
                  <motion.span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl border',
                      item.accent,
                    )}
                    animate={prefersReducedMotion ? undefined : { y: [0, -3, 0] }}
                    transition={{ duration: 3.8, delay: index * 0.08, repeat: Infinity }}
                  >
                    <Icon className="size-4" aria-hidden />
                  </motion.span>
                </div>
                <p
                  className={cn(
                    'text-stat-lg relative mt-4 break-words sm:text-stat-xl',
                    item.positive === false ? 'text-fg' : 'text-fg',
                  )}
                >
                  <CountUp
                    value={item.value}
                    prefix={item.prefix ?? (item.positive === false ? '−' : '')}
                    suffix={item.suffix ?? ''}
                    decimals={item.decimals ?? 0}
                  />
                </p>
                <div className="relative mt-3">
                  <MiniSparkline
                    values={item.spark}
                    positive={item.positive !== false}
                    className="h-8"
                  />
                </div>
              </article>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
      <HistoricalNote className="mt-6 text-center" />
    </Section>
  )
}
