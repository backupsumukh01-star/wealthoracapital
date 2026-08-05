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
import { WHY_CHOOSE_US } from '@/lib/landing-data'

const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  'badge-check': BadgeCheck,
  candlestick: CandlestickChart,
  wallet: Wallet,
  trending: TrendingUp,
  shield: Shield,
}

/** Compact feature grid — icon + title + 2-line copy, ~120–140px tall. */
export function WhyChooseUs() {
  return (
    <Section
      id="why"
      eyebrow="Why Growzy"
      title="Built for verification"
      description="Compact reasons to inspect the platform — not marketing promises."
      className="!py-10 sm:!py-14"
    >
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        {WHY_CHOOSE_US.map((item) => {
          const Icon = ICONS[item.icon] ?? Shield
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
