'use client'

import { useMediaQuery } from './use-media-query'

/**
 * The single source of truth for motion suppression.
 *
 * Every motion wrapper reads this rather than checking the media query itself, so
 * `prefers-reduced-motion` cannot be forgotten in one component (docs/10 §5).
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
