'use client'

import {
  BadgeCheck,
  CandlestickChart,
  Cpu,
  Shield,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { usePublishedFrontend } from '@/features/cms/frontend-hooks'
import { WHY_CHOOSE_US } from '@/lib/landing-data'

const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  'badge-check': BadgeCheck,
  candlestick: CandlestickChart,
  wallet: Wallet,
  trending: TrendingUp,
  shield: Shield,
}
const FALLBACK_ICONS = [Cpu, BadgeCheck, CandlestickChart, Wallet, TrendingUp, Shield]

/** Compact feature grid — icon + title + 2-line copy, ~120–140px tall. */
export function WhyChooseUs() {
  const { getSection } = usePublishedFrontend()
  const section = getSection('why_choose_us')
  const items =
    section?.items && section.items.length > 0
      ? section.items.map((item, i) => ({
          title: String(item.title ?? 'Feature'),
          description: String(item.description ?? ''),
          icon: ICONS[String(item.icon ?? '')] ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length]!,
        }))
      : WHY_CHOOSE_US.map((item) => ({
          title: item.title,
          description: item.description,
          icon: ICONS[item.icon]!,
        }))

  return (
    <Section
      id="why"
      eyebrow={section?.eyebrow || 'Why Growzy'}
      title={section?.title || 'Built for verification'}
      description={
        section?.description || 'Compact reasons to inspect the platform — not marketing promises.'
      }
      className="!py-10 sm:!py-14"
    >
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.title}>
              <article className="flex h-[120px] flex-col rounded-xl border border-white/[0.07] bg-raised/60 p-2.5 sm:h-[132px] sm:p-3.5">
                <span className="grid size-6 place-items-center rounded-md border border-line bg-accent-500/10 text-accent-300 sm:size-7">
                  <Icon className="size-3 sm:size-3.5" aria-hidden />
                </span>
                <h3 className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-tight text-fg sm:text-[14px]">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-fg-muted sm:text-[12px]">
                  {item.description}
                </p>
              </article>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
