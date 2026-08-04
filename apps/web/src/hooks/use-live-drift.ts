'use client'

import { useEffect, useState } from 'react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

/**
 * Subtle demo “live” drift around a base figure. Keeps movement tiny and
 * mean-reverting so it never looks like a real market feed or a broken counter.
 */
export function useLiveDrift(
  base: number,
  {
    intervalMs = 3400,
    maxDelta = 0.42,
    decimals = 2,
    startAfterMs = 1400,
    enabled = true,
  }: {
    intervalMs?: number
    maxDelta?: number
    decimals?: number
    startAfterMs?: number
    enabled?: boolean
  } = {},
) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [value, setValue] = useState(base)

  useEffect(() => {
    setValue(base)
  }, [base])

  useEffect(() => {
    if (!enabled || prefersReducedMotion || !Number.isFinite(base)) return

    let current = base
    let intervalId = 0

    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        const step = (Math.random() - 0.45) * maxDelta
        current += step
        if (Math.abs(current - base) > maxDelta * 3.5) {
          current = base + (Math.random() - 0.5) * maxDelta
        }
        setValue(Number(current.toFixed(decimals)))
      }, intervalMs)
    }, startAfterMs)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [base, decimals, enabled, intervalMs, maxDelta, prefersReducedMotion, startAfterMs])

  return value
}
