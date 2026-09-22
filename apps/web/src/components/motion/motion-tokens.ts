/** Shared motion tokens without importing framer-motion. */

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
