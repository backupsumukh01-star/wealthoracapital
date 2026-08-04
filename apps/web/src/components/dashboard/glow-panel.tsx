'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/**
 * Glass panel. Glow is clipped inside the card so it never paints over siblings while scrolling.
 * Slow ambient pulse — no flashing.
 */
export function GlowPanel({
  children,
  className,
  glow = true,
  border = true,
  padded = true,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
  border?: boolean
  padded?: boolean
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div className={cn('relative isolate', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl glass glass-edge shadow-e3 card-lift noise-overlay',
          border && 'gradient-border',
          padded && 'p-5 sm:p-6 lg:p-7',
        )}
      >
        {glow ? (
          prefersReducedMotion ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gradient-to-br from-accent-400/20 via-hl-cyan/10 to-transparent blur-2xl"
            />
          ) : (
            <>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gradient-to-br from-accent-400/28 via-hl-cyan/12 to-transparent blur-2xl"
                animate={{ opacity: [0.4, 0.72, 0.4], scale: [1, 1.06, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-accent-500/10 blur-3xl"
                animate={{ opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              />
            </>
          )
        ) : null}
        {/* Tiny ambient particles */}
        {!prefersReducedMotion && glow ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[12, 28, 44, 61, 78].map((left, i) => (
              <span
                key={left}
                className="absolute size-0.5 rounded-full bg-accent-300/40"
                style={{
                  left: `${left}%`,
                  top: `${18 + (i % 3) * 22}%`,
                  animation: `float ${8 + i}s ease-in-out ${i * 0.6}s infinite`,
                }}
              />
            ))}
          </div>
        ) : null}
        <div className="relative z-[2]">{children}</div>
      </div>
    </div>
  )
}
