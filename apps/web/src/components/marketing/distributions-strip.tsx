'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Clock, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

import { Section } from '@/components/common/section'
import { Money } from '@/components/common/money'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RECENT_DISTRIBUTIONS } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

/** Illustrative payout examples — not verified ledger withdrawals. */
export function DistributionsStrip() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Section
      id="distributions"
      eyebrow="Payout examples"
      title="Illustrative withdrawal examples"
      description="Sample presentation amounts between $35 and $10,000. These are not verified live investor withdrawals and are not taken from the financial ledger."
    >
      <StaggerGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RECENT_DISTRIBUTIONS.map((item, index) => (
          <StaggerItem key={`${item.name}-${item.amount}`}>
            <article className="card-fill group h-full p-4 transition-transform duration-[160ms] hover:-translate-y-1 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <Badge tone="neutral" size="sm">
                  Sample
                </Badge>
                <span className="grid size-9 place-items-center rounded-xl border border-line bg-inset text-fg-muted">
                  <Wallet className="size-4" aria-hidden />
                </span>
              </div>
              <p className="text-stat-lg mt-3 text-fg sm:mt-4">
                <Money value={item.amount} />
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-caption text-fg-subtle">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                Example clearance {item.hours} hours
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-hover">
                <motion.div
                  className="h-full rounded-full bg-accent-500/70"
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="min-w-0 truncate text-body-sm text-fg">{item.name}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-inset text-[11px] font-medium text-fg-muted">
                  {item.region}
                </span>
              </div>
            </article>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <RevealOnScroll className="mt-6 flex justify-center sm:mt-8">
        <Button asChild size="lg" className="w-full max-w-md sm:w-auto sm:max-w-none">
          <Link href={ROUTES.auth.register}>
            Open an account
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </RevealOnScroll>
    </Section>
  )
}
