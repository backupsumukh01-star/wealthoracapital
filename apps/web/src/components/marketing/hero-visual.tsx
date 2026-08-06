'use client'

import { motion } from 'framer-motion'

import { CountUp } from '@/components/motion/count-up'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const CURVE =
  'M0 168 L46 152 L92 158 L138 130 L184 138 L230 104 L276 118 L322 76 L368 88 L414 44 L460 52 L506 20'
const AREA = `${CURVE} L506 200 L0 200 Z`

/** Full-bleed programme equity visual — original SVG, no stock art. */
export function HeroVisual({ className }: { className?: string }) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div
      className={cn('relative isolate w-full select-none', className)}
      aria-hidden
      role="presentation"
    >
      <div className="panel-luxury overflow-hidden p-5 shadow-e4 sm:p-8 lg:p-10">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-caption text-fg-subtle">Programme equity · 12 months</p>
            <p className="text-stat-xl mt-1 text-profit">
              <CountUp value="89.0" prefix="+" decimals={1} suffix="%" />
            </p>
          </div>
          <span className="rounded-full border border-line-default bg-inset/70 px-3 py-1 text-[11px] text-fg-subtle">
            Published
          </span>
        </div>

        <svg
          viewBox="0 0 506 200"
          className="h-48 w-full sm:h-64 lg:h-72"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent-500)" />
              <stop offset="100%" stopColor="var(--accent-200)" />
            </linearGradient>
          </defs>

          {[40, 80, 120, 160].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="506"
              y2={y}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
          ))}

          <motion.path
            d={AREA}
            fill="url(#hero-area)"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          />

          <motion.path
            d={CURVE}
            fill="none"
            stroke="url(#hero-line)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={prefersReducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />

          <motion.circle
            cx="506"
            cy="20"
            r="5"
            fill="var(--accent-200)"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.35 }}
          />
        </svg>
      </div>
    </div>
  )
}
