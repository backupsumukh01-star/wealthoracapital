'use client'

import { motion } from 'framer-motion'
import {
  CalendarDays,
  Download,
  Filter,
  History,
  LayoutDashboard,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

import { GlassCard, SubHeading } from './glass-card'

const CARDS: { title: string; line: string; icon: LucideIcon }[] = [
  { title: 'Daily Performance', line: 'Session return published after desk sign-off.', icon: CalendarDays },
  { title: 'Historical Records', line: 'Browse prior days with full ledger context.', icon: History },
  { title: 'Downloadable Trade History', line: 'Export tickets for your own review.', icon: Download },
  { title: 'Trade Filters', line: 'Slice by pair, side, session, or outcome.', icon: Filter },
  { title: 'Withdrawal History', line: 'Every payout request stays visible.', icon: WalletCards },
  { title: 'Performance Dashboard', line: 'Equity, win rate and drawdown in one view.', icon: LayoutDashboard },
]

export function WhyWePublish() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <SubHeading
        eyebrow="Transparency"
        title="Why We Publish Every Trade"
        subtitle="Inspect historical results and trading activity — not marketing summaries alone."
      />

      <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <StaggerItem key={card.title}>
              <GlassCard className="h-full" glow={i % 3 === 0 ? 'emerald' : i % 3 === 1 ? 'cyan' : 'violet'}>
                <div className="flex items-start gap-4">
                  <motion.span
                    className="grid size-12 shrink-0 place-items-center rounded-2xl border border-glass-line bg-inset/55 text-accent-200 shadow-glow-soft"
                    animate={prefersReducedMotion ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 4, delay: i * 0.15, repeat: Infinity }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </motion.span>
                  <div>
                    <h4 className="text-heading-sm text-fg">{card.title}</h4>
                    <p className="mt-1.5 text-body-sm text-fg-muted">{card.line}</p>
                  </div>
                </div>
                <svg viewBox="0 0 180 40" className="mt-5 h-8 w-full text-accent-300/40" aria-hidden>
                  <motion.path
                    d={`M0 28 ${Array.from({ length: 12 }, (_, k) => `L${(k + 1) * 15} ${18 + ((i + k) % 5) * 3}`).join(' ')}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    initial={prefersReducedMotion ? false : { pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2 }}
                  />
                </svg>
              </GlassCard>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </div>
  )
}
