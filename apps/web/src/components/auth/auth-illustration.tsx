'use client'

import { motion } from 'framer-motion'

import { SITE } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

/** Premium right-panel illustration for the auth shell. */
export function AuthIllustration() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
      <div className="space-y-3">
        <p className="text-overline text-accent-300">Wealthora</p>
        <p className="text-display-md max-w-md text-fg">{SITE.tagline}</p>
        <p className="prose-measure text-body-md text-fg-muted">{SITE.description}</p>
      </div>

      <div className="relative mt-12">
        <div className="glass glass-edge rounded-2xl p-5 shadow-e4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-caption text-fg-subtle">Investor portfolio</p>
              <p className="text-stat-md tabular-nums text-fg">$12,480.75</p>
            </div>
            <span className="rounded-full bg-profit-bg px-2.5 py-1 text-caption tabular-nums text-profit">
              +0.70%
            </span>
          </div>

          <svg viewBox="0 0 360 120" className="h-28 w-full" aria-hidden>
            <defs>
              <linearGradient id="authCurveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 88 L40 80 L80 84 L120 68 L160 72 L200 48 L240 54 L280 30 L320 36 L360 18 V120 H0 Z"
              fill="url(#authCurveFill)"
            />
            <motion.path
              d="M0 88 L40 80 L80 84 L120 68 L160 72 L200 48 L240 54 L280 30 L320 36 L360 18"
              fill="none"
              stroke="var(--accent-300)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={prefersReducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          <ul className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-caption">
            <li>
              <p className="text-fg-subtle">Trades</p>
              <p className="mt-0.5 font-medium tabular-nums text-fg">1,284</p>
            </li>
            <li>
              <p className="text-fg-subtle">Win days</p>
              <p className="mt-0.5 font-medium tabular-nums text-profit">78%</p>
            </li>
            <li>
              <p className="text-fg-subtle">Payouts</p>
              <p className="mt-0.5 font-medium tabular-nums text-fg">&lt;24h</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
