'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

import { SubHeading } from './glass-card'

/** Compact notice — full legal text lives on the Risk Disclosure page. */
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
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-hl-amber/40 bg-hl-amber/10 text-hl-amber shadow-glow-soft">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-heading-md text-fg">Trading involves risk</p>
            <p className="mt-3 text-body-sm text-fg-muted sm:text-body-md">
              Past performance does not guarantee future results. Read the full{' '}
              <Link
                href={ROUTES.marketing.legal.riskDisclosure}
                className="font-medium text-accent-200 underline decoration-accent-500/40 underline-offset-2 hover:text-accent-100"
              >
                Risk Disclosure
              </Link>{' '}
              before you allocate capital.
            </p>
          </div>
        </div>
      </motion.aside>
    </div>
  )
}
