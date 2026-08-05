'use client'

import { motion } from 'framer-motion'
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
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { WHY_US } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  'badge-check': BadgeCheck,
  candlestick: CandlestickChart,
  wallet: Wallet,
  trending: TrendingUp,
  shield: Shield,
}

const BADGES = ['Core', 'Verified', 'Live', 'Flexible', 'Track', 'Secure'] as const

export function AdvantagesGrid() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Section
      id="why"
      eyebrow="Why Growzy"
      title="What serious capital actually needs"
      description="Transparency, control, and a desk that does not hide losing sessions."
      backdrop="grid"
    >
      <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {WHY_US.map((item, index) => {
          const Icon = ICONS[item.icon] ?? Shield
          return (
            <StaggerItem key={item.title}>
              <article className="card-fill group flex h-full flex-col p-5 transition-transform duration-[160ms] hover:-translate-y-1 sm:p-7">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent-500/10 blur-2xl transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <motion.span
                    className="grid size-12 place-items-center rounded-2xl border border-line bg-accent-500/10 text-accent-300 shadow-glow-soft"
                    animate={prefersReducedMotion ? undefined : { y: [0, -3, 0] }}
                    transition={{ duration: 4, delay: index * 0.12, repeat: Infinity }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </motion.span>
                  <span
                    className={cn(
                      'rounded-full border border-line bg-inset/60 px-2.5 py-1 text-[11px] font-medium text-fg-muted',
                    )}
                  >
                    {BADGES[index] ?? 'Core'}
                  </span>
                </div>
                <h3 className="text-heading-md relative mt-5 text-fg">{item.title}</h3>
                <p className="relative mt-2 flex-1 text-body-sm text-fg-muted">{item.description}</p>

                <div className="relative mt-5">
                  <div className="mb-1.5 flex justify-between text-[11px] text-fg-subtle">
                    <span>Signal clarity</span>
                    <span className="tabular-nums">{72 + index * 4}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-hl-cyan"
                      initial={prefersReducedMotion ? false : { width: 0 }}
                      whileInView={{ width: `${72 + index * 4}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                  <svg viewBox="0 0 140 28" className="mt-3 h-7 w-full text-accent-300/50" aria-hidden>
                    <path
                      d={`M0 20 ${Array.from({ length: 10 }, (_, k) => `L${(k + 1) * 14} ${10 + ((index + k) % 6) * 2}`).join(' ')}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </article>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </Section>
  )
}
