'use client'

import { useEffect, useRef, useState } from 'react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export interface CountUpProps {
  /** The destination value. Passed as a string so a money value never becomes a float en route. */
  value: string
  prefix?: string
  suffix?: string
  decimals?: number
  durationMs?: number
  className?: string
  locale?: string
}

/**
 * Formats a figure; optional light tween without Framer Motion.
 * Under reduced motion / missing data the final value prints immediately.
 */
export function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 900,
  className,
  locale = 'en-US',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const trimmed = value.trim()
  const target = Number(trimmed)
  const isNumeric = trimmed !== '' && Number.isFinite(target)
  const [display, setDisplay] = useState(isNumeric ? target : Number.NaN)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(Number.NaN)
      return
    }
    if (prefersReducedMotion) {
      setDisplay(target)
      return
    }

    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setDisplay(target)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [isNumeric, prefersReducedMotion, target])

  useEffect(() => {
    if (!isNumeric || prefersReducedMotion || !started) return

    // Mobile: skip tween — avoids main-thread animation work on first view.
    if (window.matchMedia('(max-width: 639px)').matches) {
      setDisplay(target)
      return
    }

    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setDisplay(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, isNumeric, prefersReducedMotion, target, durationMs])

  const formatted =
    isNumeric && Number.isFinite(display)
      ? new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(display)
      : isNumeric
        ? new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(target)
        : '—'

  return (
    <span ref={ref} data-numeric className={cn('tabular-nums', className)}>
      <span aria-hidden>
        {isNumeric ? (
          <>
            {prefix}
            {formatted}
            {suffix}
          </>
        ) : (
          formatted
        )}
      </span>
      <span className="sr-only">{isNumeric ? `${prefix}${value}${suffix}` : formatted}</span>
    </span>
  )
}
