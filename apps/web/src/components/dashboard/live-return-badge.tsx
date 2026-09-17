'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

import { AnimatedNumber } from '@/components/motion/animated-number'
import { useLiveDrift } from '@/hooks/use-live-drift'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/** Compact live today-return chip with glow, pulse, and trend arrow. */
export function LiveReturnBadge({
  basePct,
  className,
}: {
  basePct: string
  className?: string
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const base = Number(basePct)
  const live = useLiveDrift(base, {
    intervalMs: 4200,
    maxDelta: 0.035,
    decimals: 2,
    startAfterMs: 1800,
  })
  const positive = live >= 0

  return (
    <motion.span
      className={cn(
        'relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1',
        'text-caption tabular-nums',
        positive
          ? 'border-profit/35 bg-profit/10 text-profit shadow-[0_0_20px_-6px_rgba(60,203,145,0.08)]'
          : 'border-loss/35 bg-loss/10 text-loss shadow-[0_0_20px_-6px_rgba(224,92,103,0.08)]',
        className,
      )}
      animate={
        prefersReducedMotion
          ? undefined
          : {
              boxShadow: positive
                ? [
                    '0 0 14px -8px rgba(60,203,145,0.08)',
                    '0 0 22px -4px rgba(60,203,145,0.12)',
                    '0 0 14px -8px rgba(60,203,145,0.08)',
                  ]
                : [
                    '0 0 14px -8px rgba(224,92,103,0.08)',
                    '0 0 22px -4px rgba(224,92,103,0.12)',
                    '0 0 14px -8px rgba(224,92,103,0.08)',
                  ],
            }
      }
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {!prefersReducedMotion ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 opacity-40',
            positive
              ? 'bg-[radial-gradient(circle_at_30%_50%,rgba(60,203,145,0.35),transparent_65%)]'
              : 'bg-[radial-gradient(circle_at_30%_50%,rgba(224,92,103,0.3),transparent_65%)]',
          )}
        />
      ) : null}
      {positive ? (
        <TrendingUp className="relative size-3.5 shrink-0" aria-hidden />
      ) : (
        <TrendingDown className="relative size-3.5 shrink-0" aria-hidden />
      )}
      <span className="relative">
        Today{' '}
        <AnimatedNumber
          value={live}
          prefix={positive ? '+' : ''}
          suffix="%"
          decimals={2}
          duration={0.7}
        />
      </span>
    </motion.span>
  )
}
