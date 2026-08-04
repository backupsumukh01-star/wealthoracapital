'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

/**
 * Motion is configured once, here, and inherited by every wrapper below it.
 *
 * That is the whole point: `prefers-reduced-motion` cannot be forgotten per-component, because
 * no component decides for itself. Under reduced motion Framer resolves every animation to its
 * final state instantly — reveals land visible, counters jump to their number, nothing hides.
 */
export function MotionConfigProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <MotionConfig
      reducedMotion={prefersReducedMotion ? 'always' : 'user'}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionConfig>
  )
}

/** The shared easing curve, in the tuple form Framer expects. Matches `--motion-ease-out`. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const

export const DURATION = {
  instant: 0.1,
  fast: 0.16,
  normal: 0.24,
  slow: 0.36,
  slower: 0.56,
} as const
