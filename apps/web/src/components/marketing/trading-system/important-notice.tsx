'use client'

import { AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

import { SubHeading } from './glass-card'

const POINTS = [
  'Trading carries risk. Markets can move against open and closed positions.',
  'Returns vary with market conditions, liquidity, and execution quality.',
  'Past performance does not guarantee future results.',
  'Capital is exposed to market risk and may decline in value.',
]

export function ImportantNotice() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <SubHeading eyebrow="Notice" title="Important Notice" />

      <motion.aside
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-hl-amber/35 bg-glass/60 p-6 shadow-e3 backdrop-blur-xl sm:p-8"
        role="note"
        aria-label="Risk important notice"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-hl-amber/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-accent-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-hl-amber/40 bg-hl-amber/10 text-hl-amber shadow-glow-soft">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-heading-md text-fg">Read before you allocate capital</p>
            <ul className="mt-4 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-body-sm text-fg-muted sm:text-body-md">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-hl-amber" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-caption text-fg-subtle">
              Growzy does not guarantee profits or fixed returns. Illustrations on this page are
              demonstrative only.
            </p>
          </div>
        </div>
      </motion.aside>
    </div>
  )
}
