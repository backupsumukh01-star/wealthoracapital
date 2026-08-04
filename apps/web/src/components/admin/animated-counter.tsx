'use client'

import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/** Animated numeric counter for admin KPIs. */
export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const spring = useSpring(prefersReducedMotion ? value : 0, {
    stiffness: 80,
    damping: 22,
    mass: 0.8,
  })
  const display = useTransform(spring, (v) => {
    const n = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')
    return `${prefix}${n}${suffix}`
  })
  const [text, setText] = useState(
    `${prefix}${decimals > 0 ? value.toFixed(decimals) : value.toLocaleString('en-US')}${suffix}`,
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  useEffect(() => {
    const unsub = display.on('change', setText)
    return () => unsub()
  }, [display])

  return (
    <motion.span className={cn('tabular-nums', className)} aria-label={text}>
      {text}
    </motion.span>
  )
}
