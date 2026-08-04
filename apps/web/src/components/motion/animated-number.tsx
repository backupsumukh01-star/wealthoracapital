'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/** Smoothly interpolates between numeric display values (60fps-friendly). */
export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 0.85,
  className,
  locale = 'en-US',
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
  locale?: string
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const displayRef = useRef(value)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (prefersReducedMotion) {
      displayRef.current = value
      setDisplay(value)
      return
    }
    const from = displayRef.current
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        displayRef.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [value, prefersReducedMotion, duration])

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display)

  return (
    <span data-numeric className={cn('tabular-nums', className)}>
      <span aria-hidden>
        {prefix}
        {formatted}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  )
}
