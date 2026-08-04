'use client'

import { motion } from 'framer-motion'
import {
  Building2,
  CandlestickChart,
  Landmark,
  Shield,
  type LucideIcon,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { PLATFORM_FEATURES } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { ForexPairCardsInline } from './forex-pair-inline'

const ICONS: LucideIcon[] = [CandlestickChart, Landmark, Building2, Shield]

/** Feature panels with animated icons, glow, and pair cards instead of plain pills. */
export function FeatureMosaic() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Section
      id="platform"
      eyebrow="Platform"
      title="Infrastructure that feels expensive — because it is careful"
      description="Glass surfaces, precise ledgers, and a desk that publishes its work. Built for long sessions, not launch-day demos."
    >
      <StaggerGroup className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {PLATFORM_FEATURES.map((feature, index) => {
          const Icon = ICONS[index] ?? Shield
          return (
            <StaggerItem key={feature.title}>
              <article
                className={cn(
                  'group relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden p-6 transition-transform duration-[160ms] hover:-translate-y-1 sm:min-h-[300px] sm:p-9',
                  feature.tone === 'accent' ? 'panel-gradient-accent' : 'gradient-border-soft',
                )}
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-hl-cyan/10 blur-3xl transition-opacity group-hover:opacity-100"
                  aria-hidden
                />

                <div className="relative">
                  <motion.span
                    className="mb-5 grid size-12 place-items-center rounded-2xl border border-glass-line bg-glass/50 text-accent-200 shadow-glow-soft backdrop-blur-md"
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : { y: [0, -4, 0], rotate: [0, 2, 0] }
                    }
                    transition={{ duration: 4.5, delay: index * 0.2, repeat: Infinity }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </motion.span>
                  <h3 className="text-heading-xl text-fg sm:text-display-md">{feature.title}</h3>
                  <p className="mt-3 max-w-md text-body-md text-fg-muted">{feature.description}</p>
                </div>

                {'chips' in feature && feature.chips ? (
                  <div className="relative mt-6">
                    <ForexPairCardsInline pairs={[...feature.chips].slice(0, 4)} />
                  </div>
                ) : null}

                {'rails' in feature && feature.rails ? (
                  <ul className="relative mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {feature.rails.map((rail) => (
                      <li
                        key={rail}
                        className="flex h-12 items-center justify-center rounded-xl border border-line bg-inset/50 text-caption font-medium text-fg-muted transition-colors group-hover:border-accent-800"
                      >
                        {rail}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {feature.tone === 'accent' || !('chips' in feature || 'rails' in feature) ? (
                  <div className="relative mt-6 flex justify-end" aria-hidden>
                    <svg viewBox="0 0 160 72" className="h-16 w-40 text-accent-300/70 sm:h-20 sm:w-48">
                      <path
                        d="M8 52 L36 40 L58 46 L86 22 L112 30 L152 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="152" cy="10" r="4" fill="var(--hl-emerald)" />
                    </svg>
                  </div>
                ) : null}
              </article>
            </StaggerItem>
          )
        })}
      </StaggerGroup>

      <RevealOnScroll className="mt-5">
        <div className="panel-luxury flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div>
            <p className="text-heading-md text-fg">Operator review on every distribution</p>
            <p className="mt-1 text-body-sm text-fg-muted">
              Returns are applied only after the desk confirms the closed session — not estimated
              mid-trade.
            </p>
          </div>
          <p className="text-stat-md tabular-nums text-accent-300">D+0 publish</p>
        </div>
      </RevealOnScroll>
    </Section>
  )
}
