'use client'

import { motion } from 'framer-motion'
import {
  BarChart3,
  CalendarCheck2,
  Download,
  FileSpreadsheet,
  ListTree,
  PanelTop,
  type LucideIcon,
} from 'lucide-react'

import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

import { GlassCard, SubHeading } from './glass-card'

const ITEMS: { title: string; line: string; icon: LucideIcon }[] = [
  { title: 'Historical Returns', line: 'Day-by-day published results, not averages alone.', icon: BarChart3 },
  { title: 'Daily Published Performance', line: 'Each session closes with a verified figure.', icon: CalendarCheck2 },
  { title: 'Trade-by-Trade History', line: 'Inspect individual tickets when you need detail.', icon: ListTree },
  { title: 'Export CSV', line: 'Pull ledger rows into your own tools.', icon: FileSpreadsheet },
  { title: 'Download Reports', line: 'Period summaries ready for your records.', icon: Download },
  { title: 'Investor Dashboard', line: 'Balances, activity and performance in one place.', icon: PanelTop },
]

export function PerformanceTransparency() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <SubHeading
        eyebrow="Performance transparency"
        title="Performance you can inspect"
        subtitle="Tools that keep results inspectable — past figures still do not predict the future."
      />

      <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <StaggerItem key={item.title}>
              <GlassCard className="h-full" glow="accent">
                <div className="flex items-center justify-between gap-3">
                  <motion.span
                    className="grid size-11 place-items-center rounded-xl border border-glass-line bg-inset/60 text-accent-200"
                    animate={prefersReducedMotion ? undefined : { rotate: [0, 6, 0] }}
                    transition={{ duration: 4.5, delay: i * 0.1, repeat: Infinity }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </motion.span>
                  <svg viewBox="0 0 72 28" className="h-7 w-16 text-hl-emerald/70" aria-hidden>
                    <motion.path
                      d="M2 22 L14 16 L26 18 L38 10 L50 12 L70 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={prefersReducedMotion ? false : { pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9 }}
                    />
                  </svg>
                </div>
                <h4 className="text-heading-sm mt-4 text-fg">{item.title}</h4>
                <p className="mt-1.5 text-body-sm text-fg-muted">{item.line}</p>
              </GlassCard>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </div>
  )
}
