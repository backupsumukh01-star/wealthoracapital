'use client'

import { motion } from 'framer-motion'
import {
  Eye,
  FileCheck2,
  Layers,
  ScanSearch,
  Shield,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { GlassCard, SubHeading } from './glass-card'

const CARDS: {
  title: string
  line: string
  icon: LucideIcon
  status: string
  metric: string
  progress: number
}[] = [
  {
    title: 'Multi-layer Risk Controls',
    line: 'Position, day and book limits stacked.',
    icon: Layers,
    status: 'LIVE',
    metric: '3 layers armed',
    progress: 92,
  },
  {
    title: 'Human Trade Review',
    line: 'Operators can pause or reject edge cases.',
    icon: UserCheck,
    status: 'ACTIVE',
    metric: 'Desk online',
    progress: 100,
  },
  {
    title: 'Position Monitoring',
    line: 'Open risk watched until every ticket closes.',
    icon: Eye,
    status: 'LIVE',
    metric: 'Response <120ms',
    progress: 88,
  },
  {
    title: 'Daily Performance Verification',
    line: 'No publish without desk confirmation.',
    icon: FileCheck2,
    status: 'ARMED',
    metric: 'Sign-off required',
    progress: 100,
  },
  {
    title: 'Withdrawal Verification',
    line: 'Payouts reviewed against ledger truth.',
    icon: Shield,
    status: 'ACTIVE',
    metric: 'Ledger matched',
    progress: 96,
  },
  {
    title: 'Transaction Audit',
    line: 'Deposits, trades and payouts remain traceable.',
    icon: ScanSearch,
    status: 'LIVE',
    metric: 'Append-only log',
    progress: 100,
  },
]

export function CapitalProtection() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <SubHeading
        eyebrow="Capital protection"
        title="Capital Protection"
        subtitle="Controls designed to contain risk — not eliminate market exposure."
      />

      <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <StaggerItem key={card.title}>
              <GlassCard className="h-full" glow={i % 2 === 0 ? 'emerald' : 'amber'}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge tone="profit" size="sm">
                    {card.status}
                  </Badge>
                  <span className="text-[11px] tabular-nums text-fg-subtle">{card.metric}</span>
                </div>

                <div className="relative mb-4 h-16 overflow-hidden rounded-xl border border-line bg-inset/50">
                  <svg viewBox="0 0 200 64" className="h-full w-full" aria-hidden>
                    <defs>
                      <linearGradient id={`shield-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--accent-400)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--hl-emerald)" stopOpacity="0.18" />
                      </linearGradient>
                      <filter id={`glow-${i}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="2.2" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <motion.rect
                      x="20"
                      y="10"
                      width="160"
                      height="44"
                      rx="12"
                      fill={`url(#shield-${i})`}
                      animate={prefersReducedMotion ? undefined : { opacity: [0.45, 0.95, 0.45] }}
                      transition={{ duration: 3.2, delay: i * 0.1, repeat: Infinity }}
                    />
                    <motion.path
                      d="M100 16 L128 26 L128 40 C128 50 116 56 100 58 C84 56 72 50 72 40 L72 26 Z"
                      fill="none"
                      stroke="var(--accent-200)"
                      strokeWidth="1.75"
                      filter={`url(#glow-${i})`}
                      initial={prefersReducedMotion ? false : { pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1 }}
                    />
                  </svg>
                  <motion.span
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg border border-glass-line bg-raised/80 text-accent-200"
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : { y: [0, -3, 0], rotate: [0, 4, 0] }
                    }
                    transition={{ duration: 4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                    whileHover={{ scale: 1.08 }}
                  >
                    <Icon className="size-4" aria-hidden />
                  </motion.span>
                </div>

                <h4 className="text-heading-sm text-fg">{card.title}</h4>
                <p className="mt-1.5 text-body-sm text-fg-muted">{card.line}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[10px] text-fg-subtle">
                    <span>Control health</span>
                    <span className="tabular-nums">{card.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className={cn(
                        'h-full rounded-full bg-gradient-to-r from-accent-700 to-hl-emerald',
                        'shadow-[0_0_12px_rgba(212,217,223,0.45)]',
                      )}
                      initial={prefersReducedMotion ? { width: `${card.progress}%` } : { width: 0 }}
                      whileInView={{ width: `${card.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              </GlassCard>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </div>
  )
}
