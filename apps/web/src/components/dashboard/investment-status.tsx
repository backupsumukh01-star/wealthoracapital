'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, Clock3, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

import { Progress } from '@/components/ui/progress'
import { DEMO_PROFILE, getNextSettlementAt } from '@/lib/dashboard-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function InvestmentStatus() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [left, setLeft] = useState(() =>
    Math.max(0, getNextSettlementAt().getTime() - Date.now()),
  )

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, getNextSettlementAt().getTime() - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const dayMs = 24 * 60 * 60 * 1000
  const progress = Math.min(100, Math.round(((dayMs - left) / dayMs) * 100))

  return (
    <div className="card-lift noise-overlay relative overflow-hidden rounded-3xl border border-accent-700/30 bg-gradient-to-br from-accent-500/15 via-raised/80 to-inset/90 p-5 shadow-e2">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-0 size-32 rounded-full bg-hl-cyan/15 blur-2xl"
      />
      {!prefersReducedMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-8 bottom-0 size-24 rounded-full bg-accent-400/10 blur-2xl"
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}
      <p className="inline-flex items-center gap-1.5 text-overline text-accent-300">
        <Sparkles className="size-3.5 animate-pulse" aria-hidden />
        Investment status
      </p>

      <dl className="relative mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Account status</dt>
          <dd className="inline-flex items-center gap-1.5 text-body-sm font-medium text-profit">
            <BadgeCheck className="size-4" aria-hidden />
            {DEMO_PROFILE.verificationStatus}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Investment status</dt>
          <dd className="text-body-sm font-medium text-accent-200">Active · {DEMO_PROFILE.plan}</dd>
        </div>
      </dl>

      <div className="relative mt-5 rounded-2xl border border-line/80 bg-inset/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-caption text-fg-subtle">
            <Clock3 className="size-3.5" aria-hidden />
            Next Daily Settlement
          </p>
          <p
            className="font-mono text-body-sm tabular-nums text-fg tracking-wide"
            aria-live="polite"
          >
            {formatCountdown(left)}
          </p>
        </div>
        <Progress value={progress} className="mt-3 h-1.5" tone="profit" />
      </div>
    </div>
  )
}
