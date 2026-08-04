'use client'

import { useId, useMemo } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/** Tiny SVG sparkline for market / pair cards — original, no chart library. */
export function MiniSparkline({
  values,
  positive = true,
  className,
}: {
  values: number[]
  positive?: boolean
  className?: string
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const gradId = useId()

  const { path, area } = useMemo(() => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const w = 120
    const h = 36
    const pts = values.map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${x},${y}`
    })
    const line = `M ${pts.join(' L ')}`
    const areaPath = `${line} L ${w},${h} L 0,${h} Z`
    return { path: line, area: areaPath }
  }, [values])

  const stroke = positive ? 'var(--hl-emerald)' : 'var(--loss)'

  return (
    <svg
      viewBox="0 0 120 36"
      className={cn('h-9 w-full overflow-visible', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradId})`}
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}
