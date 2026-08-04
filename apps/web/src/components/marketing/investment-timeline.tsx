'use client'

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  CandlestickChart,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { cn } from '@/lib/cn'

const STEPS: {
  title: string
  description: string
  icon: LucideIcon
  accent: string
}[] = [
  {
    title: 'Deposit',
    description: 'Fund via bank, card, or crypto and upload proof for review.',
    icon: ArrowDownToLine,
    accent: 'text-hl-cyan bg-hl-cyan/10 border-hl-cyan/30',
  },
  {
    title: 'Verification',
    description: 'An operator confirms the transfer before capital goes live.',
    icon: BadgeCheck,
    accent: 'text-hl-emerald bg-hl-emerald/10 border-hl-emerald/30',
  },
  {
    title: 'Trading',
    description: 'AI-assisted setups execute under desk risk limits.',
    icon: CandlestickChart,
    accent: 'text-hl-violet bg-hl-violet/10 border-hl-violet/30',
  },
  {
    title: 'Profit',
    description: 'Verified daily returns publish to every eligible wallet.',
    icon: TrendingUp,
    accent: 'text-hl-amber bg-hl-amber/10 border-hl-amber/30',
  },
  {
    title: 'Withdrawal',
    description: 'Request a payout anytime — no lock-up, full ledger trail.',
    icon: ArrowUpFromLine,
    accent: 'text-hl-blue bg-hl-blue/10 border-hl-blue/30',
  },
]

/** Animated investor journey timeline. */
export function InvestmentTimeline() {
  return (
    <Section
      id="journey"
      eyebrow="Investor journey"
      title="From deposit to payout — one clear path"
      description="Each milestone is logged. Nothing important happens off-platform."
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute left-6 top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-hl-cyan/50 via-accent-400/40 to-hl-violet/40 md:left-1/2 md:block"
          aria-hidden
        />

        <StaggerGroup className="space-y-4 md:space-y-0">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const right = index % 2 === 1
            return (
              <StaggerItem key={step.title}>
                <div
                  className={cn(
                    'relative grid items-center gap-4 md:grid-cols-2 md:gap-10',
                    right && 'md:[&>*:first-child]:order-2',
                  )}
                >
                  <article className="gradient-border-soft ml-12 p-5 transition-transform duration-[160ms] hover:-translate-y-1 md:ml-0">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'grid size-11 shrink-0 place-items-center rounded-2xl border',
                          step.accent,
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-overline text-fg-subtle">
                          Step {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3 className="text-heading-md mt-1 text-fg">{step.title}</h3>
                        <p className="mt-2 text-body-sm text-fg-muted">{step.description}</p>
                      </div>
                    </div>
                  </article>

                  <div className="absolute left-6 top-6 z-10 grid size-3 -translate-x-1/2 place-items-center md:left-1/2">
                    <span className="size-3 rounded-full bg-accent-300 shadow-glow" />
                  </div>

                  <div className="hidden md:block" aria-hidden />
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </Section>
  )
}
