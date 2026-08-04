'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

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
 * Animates a figure from zero to its value on first view, once.
 *
 * Tabular figures are non-negotiable here: a count-up on proportional digits wobbles, and
 * wobbling money looks unserious. Under reduced motion the number is simply printed.
 */
export function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 1200,
  className,
  locale = 'en-US',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  const prefersReducedMotion = usePrefersReducedMotion()

  const target = Number(value)
  const isNumeric = Number.isFinite(target)
  const [display, setDisplay] = useState(isNumeric ? 0 : Number.NaN)

  useEffect(() => {
    if (!isNumeric) return
    if (prefersReducedMotion) {
      setDisplay(target)
      return
    }
    if (!isInView) return

    const controls = animate(0, target, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
    })

    return () => controls.stop()
  }, [isInView, isNumeric, prefersReducedMotion, target, durationMs])

  const formatted = isNumeric
    ? new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display)
    : value

  return (
    <span ref={ref} data-numeric className={cn('tabular-nums', className)}>
      {/* The final value is always in the DOM for assistive technology, animation or not. */}
      <span aria-hidden>
        {prefix}
        {formatted}
        {suffix}
      </span>
      <span className="sr-only">{`${prefix}${value}${suffix}`}</span>
    </span>
  )
}
