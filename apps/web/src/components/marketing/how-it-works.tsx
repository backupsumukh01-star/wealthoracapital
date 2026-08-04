'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowRight,
  BadgeCheck,
  CandlestickChart,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'
import { HOW_IT_WORKS } from '@/lib/landing-data'
import { cn } from '@/lib/cn'

const STEP_STYLES = [
  'panel-gradient-steel',
  'panel-gradient-accent',
  'panel-luxury',
  'panel-gradient-profit',
] as const

const STEP_ICONS: LucideIcon[] = [UserPlus, Wallet, CandlestickChart, BadgeCheck]

/** Premium step panels — Register → Deposit → Trading → Returns. */
export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Four steps from register to published returns"
      description="Simple path. No lock-up. The desk publishes the work; eligible wallets receive the verified result."
    >
      <StaggerGroup className="grid gap-3 sm:gap-4 md:gap-5">
        {HOW_IT_WORKS.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? BadgeCheck
          return (
            <StaggerItem key={step.step}>
              <article
                className={cn(
                  'group relative overflow-hidden p-5 transition-transform duration-[160ms] hover:-translate-y-1 sm:min-h-[200px] sm:p-8 lg:p-10',
                  STEP_STYLES[index % STEP_STYLES.length],
                )}
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-glass-line bg-glass/40 text-accent-200 backdrop-blur-md transition-transform duration-[160ms] group-hover:scale-105 sm:size-12">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-overline text-fg-subtle">Step {step.step}</p>
                    <h3 className="text-heading-lg mt-1.5 break-words text-fg sm:text-heading-xl">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-body-sm text-fg-muted sm:mt-3 sm:text-body-md">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            </StaggerItem>
          )
        })}
      </StaggerGroup>

      <RevealOnScroll className="mt-8 flex flex-col items-center gap-4 text-center sm:mt-10">
        <Button asChild variant="secondary" size="lg" className="w-full max-w-md sm:w-auto">
          <Link href={ROUTES.marketing.ourTradingSystem}>
            Explore our trading system
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </RevealOnScroll>
    </Section>
  )
}
