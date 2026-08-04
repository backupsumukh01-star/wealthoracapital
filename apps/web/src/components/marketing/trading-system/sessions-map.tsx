'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { GlassCard, SubHeading } from './glass-card'

const W = 1000
const H = 480

type Hub = {
  id: string
  label: string
  x: number
  y: number
  pairs: string
  volume: string
  session: string
}

const HUBS: Hub[] = [
  { id: 'lon', label: 'London', x: 48.2, y: 32, pairs: 'EUR/USD · GBP/USD', volume: '$1.8T', session: '07:00–16:00 UTC' },
  { id: 'nyc', label: 'New York', x: 24, y: 36, pairs: 'USD majors', volume: '$1.4T', session: '12:00–21:00 UTC' },
  { id: 'tyo', label: 'Tokyo', x: 86, y: 40, pairs: 'USD/JPY · AUD/JPY', volume: '$420B', session: '00:00–09:00 UTC' },
  { id: 'syd', label: 'Sydney', x: 88, y: 72, pairs: 'AUD/USD · NZD', volume: '$180B', session: '21:00–06:00 UTC' },
  { id: 'sgp', label: 'Singapore', x: 78.5, y: 58, pairs: 'USD/SGD · Asia FX', volume: '$310B', session: '01:00–10:00 UTC' },
  { id: 'dxb', label: 'Dubai', x: 62.5, y: 42, pairs: 'XAU · USD/AED', volume: '$95B', session: '04:00–13:00 UTC' },
]

const LINKS: Array<[string, string]> = [
  ['lon', 'nyc'],
  ['lon', 'dxb'],
  ['dxb', 'sgp'],
  ['sgp', 'tyo'],
  ['tyo', 'syd'],
  ['nyc', 'lon'],
]

/** Demo rotation of “active” sessions — illustrative only. */
const ROTATION = ['tyo', 'sgp', 'lon', 'nyc', 'dxb', 'syd'] as const

export function TradingSessionsMap() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeId, setActiveId] = useState<string>(ROTATION[0])
  const [hoverId, setHoverId] = useState<string | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => {
      setActiveId((prev) => {
        const idx = ROTATION.indexOf(prev as (typeof ROTATION)[number])
        return ROTATION[(idx + 1) % ROTATION.length]!
      })
    }, 3200)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  const byId = useMemo(() => Object.fromEntries(HUBS.map((h) => [h.id, h])), [])
  const focusId = hoverId ?? activeId
  const focus = byId[focusId]

  return (
    <div>
      <SubHeading
        eyebrow="Global sessions"
        title="Interactive World Trading Sessions"
        subtitle="Watch hubs light up as the demo session clock rotates — illustrative market context."
      />

      <GlassCard glow="cyan" interactive={false} className="overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-overline text-hl-cyan">Session clock · demo</p>
            <p className="mt-1 text-heading-sm text-fg">
              Active: <span className="text-accent-200">{focus?.label ?? '—'}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {HUBS.map((h) => (
              <button
                key={h.id}
                type="button"
                onMouseEnter={() => setHoverId(h.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(h.id)}
                onBlur={() => setHoverId(null)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] transition-colors',
                  focusId === h.id
                    ? 'border-accent-500 bg-accent-500/15 text-accent-200'
                    : 'border-line text-fg-subtle hover:border-accent-700 hover:text-fg',
                )}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative aspect-[5/3] w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-inset/70 sm:aspect-[2/1]">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="World trading sessions map">
            <defs>
              <radialGradient id="tsAura" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="var(--hl-cyan)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="tsLand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--border-default)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--border-subtle)" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="tsLink" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--hl-cyan)" stopOpacity="0.2" />
                <stop offset="50%" stopColor="var(--accent-300)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--hl-violet)" stopOpacity="0.25" />
              </linearGradient>
              <filter id="tsGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width={W} height={H} fill="url(#tsAura)" />
            <path d="M90 150 C160 100 250 115 300 165 C340 210 320 255 260 270 C190 285 100 230 90 180 Z" fill="url(#tsLand)" />
            <path d="M280 115 C380 80 470 95 540 155 C585 200 560 265 490 285 C400 310 300 245 280 175 Z" fill="url(#tsLand)" />
            <path d="M530 155 C630 120 740 140 800 205 C845 260 820 330 730 350 C640 370 540 305 530 230 Z" fill="url(#tsLand)" />
            <path d="M770 295 C840 270 920 300 955 365 C975 410 930 450 865 440 C800 430 755 365 770 295 Z" fill="url(#tsLand)" />
            <path d="M190 285 C255 270 305 325 285 390 C265 445 195 455 160 410 C125 365 150 305 190 285 Z" fill="url(#tsLand)" />

            {LINKS.map(([a, b]) => {
              const from = byId[a]
              const to = byId[b]
              if (!from || !to) return null
              const x1 = (from.x / 100) * W
              const y1 = (from.y / 100) * H
              const x2 = (to.x / 100) * W
              const y2 = (to.y / 100) * H
              const mx = (x1 + x2) / 2
              const my = Math.min(y1, y2) - 36
              const active = a === focusId || b === focusId
              return (
                <motion.path
                  key={`${a}-${b}`}
                  d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke="url(#tsLink)"
                  strokeWidth={active ? 2.2 : 1.1}
                  strokeOpacity={active ? 0.95 : 0.35}
                  initial={prefersReducedMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
              )
            })}

            {HUBS.map((hub) => {
              const cx = (hub.x / 100) * W
              const cy = (hub.y / 100) * H
              const on = hub.id === focusId
              return (
                <g
                  key={hub.id}
                  filter={on ? 'url(#tsGlow)' : undefined}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverId(hub.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {on && !prefersReducedMotion ? (
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={18}
                      fill="var(--accent-400)"
                      fillOpacity={0.25}
                      animate={{ r: [14, 26, 14], opacity: [0.45, 0.1, 0.45] }}
                      transition={{ duration: 2.4, repeat: Infinity }}
                    />
                  ) : null}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={on ? 7 : 5}
                    fill={on ? 'var(--accent-200)' : 'var(--fg-muted)'}
                  />
                  <text
                    x={cx}
                    y={cy - 14}
                    textAnchor="middle"
                    fill="var(--fg)"
                    fontSize="12"
                    fontWeight={on ? 600 : 400}
                  >
                    {hub.label}
                  </text>
                </g>
              )
            })}
          </svg>

          <AnimatePresence mode="wait">
            {focus ? (
              <motion.div
                key={focus.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl border border-glass-line bg-raised/90 p-3 shadow-e3 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-auto sm:w-72 sm:p-4"
              >
                <p className="text-overline text-hl-cyan">{focus.label} session</p>
                <p className="mt-1 text-caption text-fg">{focus.pairs}</p>
                <div className="mt-2 flex gap-4 text-[11px] text-fg-muted">
                  <span>
                    Volume <strong className="text-fg">{focus.volume}</strong>
                  </span>
                  <span className="tabular-nums">{focus.session}</span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  )
}
