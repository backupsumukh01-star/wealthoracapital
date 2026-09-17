'use client'

import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

const PARTICLES = [
  { x: '8%', y: '18%', size: 3, delay: 0 },
  { x: '22%', y: '72%', size: 2, delay: 0.4 },
  { x: '38%', y: '28%', size: 4, delay: 0.8 },
  { x: '55%', y: '62%', size: 2.5, delay: 1.2 },
  { x: '70%', y: '20%', size: 3, delay: 0.2 },
  { x: '84%', y: '48%', size: 2, delay: 1.6 },
  { x: '12%', y: '52%', size: 2.5, delay: 1 },
  { x: '92%', y: '78%', size: 3.5, delay: 0.6 },
  { x: '48%', y: '88%', size: 2, delay: 1.4 },
  { x: '64%', y: '12%', size: 2.5, delay: 0.9 },
]

/** Soft floating dots for the auth atmosphere. Disabled under reduced motion. */
export function FloatingParticles() {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-accent-300/40"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            boxShadow: '0 0 12px rgb(212 217 223 / 0.12)',
          }}
          animate={{ y: [0, -14, 0], opacity: [0.25, 0.7, 0.25] }}
          transition={{
            duration: 5 + (i % 4),
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
