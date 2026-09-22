'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

/** Soft floating particles — fewer on mobile to cut main-thread animation work. */
export function AmbientParticles() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [count, setCount] = useState(8)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setCount(mq.matches ? 8 : 28)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        size: 2 + (i % 4),
        duration: 12 + (i % 8) * 2,
        delay: (i % 10) * 0.4,
        opacity: 0.12 + (i % 5) * 0.04,
      })),
    [count],
  )

  if (prefersReducedMotion) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-radial-accent opacity-40" />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-accent-300"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{ y: [0, -24, 0], opacity: [p.opacity, p.opacity * 1.6, p.opacity] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
