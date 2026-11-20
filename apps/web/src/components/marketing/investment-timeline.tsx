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
}[] = [
  {
    title: 'Deposit',
    description: 'Fund via bank, card or crypto and upload proof for review.',
    icon: ArrowDownToLine,
  },
  {
    title: 'Verification',
    description: 'An operator confirms the transfer before capital goes live.',
    icon: BadgeCheck,
  },
  {
    title: 'Trading',
    description: 'AI-assisted setups execute under desk risk limits.',
    icon: CandlestickChart,
  },
  {
    title: 'Profit',
    description: 'Verified daily returns publish to every eligible wallet.',
    icon: TrendingUp,
  },
  {
    title: 'Withdrawal',
    description: 'Request a payout anytime — no lock-up, full ledger trail.',
    icon: ArrowUpFromLine,
  },
]

const ICON_SHELL =
  'grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-accent-200'

/** Animated investor journey timeline — 3-col grid keeps spine + cards aligned. */
export function InvestmentTimeline() {
  return (
    <Section
      id="journey"
      eyebrow="Investor journey"
      title="From deposit to payout — one clear path"
      description="Each milestone is logged. Nothing important happens off-platform."
      className="scroll-mt-[var(--sticky-chrome)]"
      containerClassName="pt-1"
    >
      <div className="relative mx-auto max-w-5xl">
        {/* Desktop spine — true center of the 3-column grid */}
        <div
          className="pointer-events-none absolute bottom-8 left-1/2 top-8 hidden w-px -translate-x-1/2 bg-gradient-to-b from-white/20 via-accent-400/35 to-white/10 md:block"
          aria-hidden
        />
        {/* Mobile spine */}
        <div
          className="pointer-events-none absolute bottom-6 left-[1.375rem] top-6 w-px bg-gradient-to-b from-white/20 via-accent-400/35 to-white/10 md:hidden"
          aria-hidden
        />

        <StaggerGroup className="flex flex-col gap-8 sm:gap-10 md:gap-12">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const onRight = index % 2 === 1
            const stepLabel = String(index + 1).padStart(2, '0')

            return (
              <StaggerItem key={step.title}>
                {/* Mobile: icon rail + card */}
                <div className="relative flex gap-4 md:hidden">
                  <div className="relative z-10 flex w-11 shrink-0 justify-center pt-5">
                    <span className="size-2.5 rounded-full bg-accent-300 shadow-[0_0_12px_rgba(212,217,223,0.55)]" />
                  </div>
                  <article className="gradient-border-soft min-w-0 flex-1 p-5 sm:p-6">
                    <div className="flex items-start gap-3.5">
                      <span className={ICON_SHELL}>
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-overline text-fg-subtle">Step {stepLabel}</p>
                        <h3 className="mt-1 text-heading-md text-fg">{step.title}</h3>
                        <p className="mt-2 text-body-sm leading-relaxed text-fg-muted">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Desktop: left | node | right */}
                <div className="relative hidden md:grid md:grid-cols-[1fr_2.5rem_1fr] md:items-center md:gap-x-6 lg:gap-x-10">
                  <div className={cn(onRight && 'col-start-1 row-start-1')}>
                    {!onRight ? <StepCard step={step} stepLabel={stepLabel} Icon={Icon} /> : null}
                  </div>

                  <div className="relative z-10 col-start-2 row-start-1 flex justify-center">
                    <span className="size-3 rounded-full bg-accent-300 shadow-[0_0_14px_rgba(212,217,223,0.6)]" />
                  </div>

                  <div className="col-start-3 row-start-1">
                    {onRight ? <StepCard step={step} stepLabel={stepLabel} Icon={Icon} /> : null}
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </Section>
  )
}

function StepCard({
  step,
  stepLabel,
  Icon,
}: {
  step: (typeof STEPS)[number]
  stepLabel: string
  Icon: LucideIcon
}) {
  return (
    <article className="gradient-border-soft p-6 transition-transform duration-[160ms] hover:-translate-y-1 lg:p-7">
      <div className="flex items-start gap-4">
        <span className={ICON_SHELL}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-overline text-fg-subtle">Step {stepLabel}</p>
          <h3 className="mt-1.5 text-heading-md text-fg lg:text-heading-lg">{step.title}</h3>
          <p className="mt-2 max-w-md text-body-sm leading-relaxed text-fg-muted lg:text-body-md">
            {step.description}
          </p>
        </div>
      </div>
    </article>
  )
}
