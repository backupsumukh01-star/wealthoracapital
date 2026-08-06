'use client'

import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { usePublicPerformanceMonthly } from '@/features/performance/hooks'
import { MONTHLY_RETURNS } from '@/lib/landing-data'
import { cn } from '@/lib/cn'

type Point = { month: string; value: number }

/** Cumulative growth path from monthly returns starting at 100. */
function buildGrowth(points: Point[]) {
  let bal = 100
  return points.map((p) => {
    bal = Number((bal * (1 + p.value / 100)).toFixed(2))
    return { ...p, balance: bal }
  })
}

function useMonthlySeries(): Point[] {
  const { data: monthly } = usePublicPerformanceMonthly()
  return useMemo(
    () => {
      const source = monthly && monthly.length > 0 ? monthly : MONTHLY_RETURNS
      return source.map((m) => ({
        month: m.month,
        value: Number.parseFloat(String(m.returnPct)) || 0,
      }))
    },
    [monthly],
  )
}

/**
 * Custom SVG monthly performance chart — published performance API only.
 * Renders nothing when there is no published monthly series.
 */
export function MonthlyPerformanceChart() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const gid = useId()
  const series = useMonthlySeries()
  const data = useMemo(() => buildGrowth(series), [series])
  const [active, setActive] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 640
  const H = 240
  const pad = { t: 20, r: 16, b: 32, l: 40 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const min = data.length ? Math.min(...data.map((d) => d.balance)) * 0.96 : 0
  const max = data.length ? Math.max(...data.map((d) => d.balance)) * 1.02 : 1

  const coords = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW
    const y = pad.t + (1 - (d.balance - min) / (max - min || 1)) * innerH
    return { x, y, ...d }
  })

  const pickFromEvent = useCallback(
    (clientX: number) => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * W
      let best = 0
      let bestDist = Infinity
      coords.forEach((c, i) => {
        const d = Math.abs(c.x - x)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      setActive(best)
    },
    [coords],
  )

  if (data.length === 0) return null

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const area = `${line} L ${coords.at(-1)!.x} ${pad.t + innerH} L ${coords[0]!.x} ${pad.t + innerH} Z`
  const tip = active !== null ? coords[active] : null

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption text-fg-subtle">Growth of $100</p>
          <p className="text-stat-md mt-0.5 tabular-nums text-fg sm:text-stat-lg">
            ${data.at(-1)!.balance.toFixed(0)}{' '}
            <span className="text-body-sm font-normal text-profit">
              +{(data.at(-1)!.balance - 100).toFixed(0)}%
            </span>
          </p>
        </div>
        <p className="text-caption text-fg-subtle">Published monthly performance</p>
      </div>

      <div className="h-[220px] w-full min-w-0 overflow-hidden sm:h-[280px] lg:h-[360px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full touch-pan-y"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Monthly performance growth chart"
          onPointerDown={(e) => {
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            pickFromEvent(e.clientX)
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === 'mouse') pickFromEvent(e.clientX)
            else if (e.buttons > 0) pickFromEvent(e.clientX)
          }}
          onPointerLeave={() => {
            if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
              setActive(null)
            }
          }}
        >
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12D6A0" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#12D6A0" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5EF2C4" />
              <stop offset="55%" stopColor="#12D6A0" />
              <stop offset="100%" stopColor="#2AE8FF" />
            </linearGradient>
            <filter id={`${gid}-glow`} x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = pad.t + t * innerH
            return (
              <line
                key={t}
                x1={pad.l}
                x2={W - pad.r}
                y1={y}
                y2={y}
                stroke="var(--border-subtle)"
                strokeOpacity="0.7"
              />
            )
          })}

          <motion.path
            d={area}
            fill={`url(#${gid}-fill)`}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={`url(#${gid}-stroke)`}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${gid}-glow)`}
            initial={prefersReducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />

          {coords.map((c, i) => (
            <g key={c.month}>
              <circle
                cx={c.x}
                cy={c.y}
                r={active === i ? 5.5 : 3.5}
                fill={active === i ? '#5EF2C4' : '#12D6A0'}
                stroke="#07131C"
                strokeWidth="1.5"
              />
              <text
                x={c.x}
                y={H - 10}
                textAnchor="middle"
                fill="var(--text-tertiary)"
                fontSize="11"
              >
                {c.month}
              </text>
            </g>
          ))}

          {tip ? (
            <g>
              <line
                x1={tip.x}
                x2={tip.x}
                y1={pad.t}
                y2={pad.t + innerH}
                stroke="#5EF2C4"
                strokeOpacity="0.35"
                strokeDasharray="3 4"
              />
              <foreignObject
                x={Math.min(Math.max(tip.x - 70, 4), W - 144)}
                y={Math.max(tip.y - 56, 4)}
                width="140"
                height="48"
              >
                <div className="rounded-xl border border-glass-line bg-overlay/95 px-2.5 py-2 text-[11px] shadow-e3 backdrop-blur-md">
                  <p className="font-medium text-fg">
                    {tip.month} · ${tip.balance.toFixed(0)}
                  </p>
                  <p className="tabular-nums text-profit">+{tip.value}%</p>
                </div>
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-fg-subtle sm:hidden">
        Touch a point to inspect a month
      </p>
    </div>
  )
}

/** Expandable monthly performance timeline. Falls back to demo data when no live data. */
export function MonthlyPerformanceTimeline() {
  const [open, setOpen] = useState<string | null>(null)
  const series = useMonthlySeries()

  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-raised/50 p-3 sm:p-5">
      <h3 className="text-[15px] font-semibold text-fg">Monthly performance</h3>
      <p className="mt-0.5 text-[11px] text-fg-subtle">Tap a month for details</p>
      <ul className="mt-4 space-y-2">
        {series.map((m) => {
          const up = m.value >= 0
          const isOpen = open === m.month
          return (
            <li key={m.month} className="min-w-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.month)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  isOpen
                    ? 'border-accent-700 bg-accent-500/10'
                    : 'border-line bg-inset/40 hover:border-line-strong',
                )}
              >
                <span className="w-10 shrink-0 text-caption font-medium text-fg-muted">
                  {m.month}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-body-sm font-medium tabular-nums',
                    up ? 'text-profit' : 'text-loss',
                  )}
                >
                  {up ? '+' : ''}
                  {m.value}%
                </span>
              </button>
              {isOpen ? (
                <div className="mt-1.5 rounded-xl border border-line bg-raised/60 px-3 py-3 text-caption text-fg-muted">
                  <p>
                    Return <span className="tabular-nums text-fg">{up ? '+' : ''}{m.value}%</span>
                  </p>
                  <p className="mt-1 text-fg-subtle">
                    Published programme result for {m.month}. Past performance does not guarantee
                    future results.
                  </p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
