'use client'

import {
  ChartNoAxesCombined,
  Globe2,
  PiggyBank,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { usePublishedFrontend } from '@/features/cms/frontend-hooks'
import { cn } from '@/lib/cn'

const ICONS: LucideIcon[] = [Users, Globe2, PiggyBank, ChartNoAxesCombined, TrendingUp, Target]
const ACCENTS = [
  'text-hl-emerald bg-hl-emerald/10 border-hl-emerald/30',
  'text-hl-cyan bg-hl-cyan/10 border-hl-cyan/30',
  'text-hl-amber bg-hl-amber/10 border-hl-amber/30',
  'text-hl-blue bg-hl-blue/10 border-hl-blue/30',
  'text-hl-violet bg-hl-violet/10 border-hl-violet/30',
  'text-accent-300 bg-accent-500/10 border-accent-700/40',
]

const FALLBACK_STATS: {
  label: string
  value: string
  prefix?: string
  suffix?: string
  decimals?: number
  icon: LucideIcon
  accent: string
}[] = [
  {
    label: 'Active investors',
    value: '4820',
    suffix: '+',
    icon: Users,
    accent: ACCENTS[0]!,
  },
  {
    label: 'Countries',
    value: '42',
    icon: Globe2,
    accent: ACCENTS[1]!,
  },
  {
    label: 'Daily withdrawals',
    value: '146',
    icon: PiggyBank,
    accent: ACCENTS[2]!,
  },
  {
    label: 'Assets under management',
    value: '18.4',
    prefix: '$',
    suffix: 'M',
    decimals: 1,
    icon: ChartNoAxesCombined,
    accent: ACCENTS[3]!,
  },
  {
    label: "Today's published return",
    value: '0.70',
    suffix: '%',
    decimals: 2,
    icon: TrendingUp,
    accent: ACCENTS[4]!,
  },
  {
    label: 'Win rate',
    value: '78.6',
    suffix: '%',
    decimals: 1,
    icon: Target,
    accent: ACCENTS[5]!,
  },
]

/** Investor stats with viewport-triggered animated counters. */
export function StatsBand() {
  const { getSection } = usePublishedFrontend()
  const section = getSection('statistics')
  const stats =
    section?.items && section.items.length > 0
      ? section.items.map((item, i) => ({
          label: String(item.label ?? item.title ?? 'Stat'),
          value: String(item.value ?? '0'),
          prefix: item.prefix ? String(item.prefix) : '',
          suffix: item.suffix ? String(item.suffix) : '',
          decimals: String(item.value ?? '').includes('.') ? 1 : 0,
          icon: ICONS[i % ICONS.length]!,
          accent: ACCENTS[i % ACCENTS.length]!,
        }))
      : FALLBACK_STATS

  return (
    <Section id="stats" className="!pt-8 lg:!pt-12" backdrop="glow">
      <RevealOnScroll>
        <p className="text-center text-heading-xl text-fg sm:text-display-md">
          {section?.title || 'Built for investors who read the tape'}
        </p>
      </RevealOnScroll>

      <StaggerGroup className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <StaggerItem key={stat.label}>
              <div className="card-fill group flex h-full flex-col justify-between p-4 transition-transform duration-[160ms] hover:-translate-y-1 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-overline max-w-[70%] leading-snug text-fg-subtle">{stat.label}</p>
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl border transition-transform group-hover:scale-105',
                      stat.accent,
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                </div>
                <div className="mt-5 sm:mt-7">
                  <p className="text-stat-xl break-words text-fg">
                    <CountUp
                      value={stat.value}
                      prefix={stat.prefix ?? ''}
                      suffix={stat.suffix ?? ''}
                      decimals={stat.decimals ?? 0}
                    />
                  </p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-hover">
                    <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-accent-500/80 to-hl-cyan/80 transition-all group-hover:w-[85%]" />
                  </div>
                </div>
              </div>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </Section>
  )
}
