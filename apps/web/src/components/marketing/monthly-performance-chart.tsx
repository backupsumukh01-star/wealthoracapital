'use client'

import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { useLandingLiveStats, useLandingMonthlySeries } from '@/features/landing'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

type Point = {
  key: string
  label: string
  fullLabel: string
  value: number
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function formatMonthParts(month: string): { key: string; label: string; fullLabel: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (match) {
    const year = match[1]!
    const idx = Number(match[2]) - 1
    const short = MONTH_SHORT[idx] ?? match[2]
    const full = FULL_MONTHS[idx] ?? month
    const yy = year.slice(2)
    return {
      key: month,
      label: `${short} ${yy}`,
      fullLabel: `${full} ${year}`,
    }
  }
  return { key: month, label: month, fullLabel: month }
}

/** Cumulative growth path from monthly returns starting at 100. */
function buildGrowth(points: Point[]) {
  let bal = 100
  return points.map((p) => {
    const start = bal
    bal = Number((bal * (1 + p.value / 100)).toFixed(4))
    return {
      ...p,
      startBalance: start,
      endBalance: bal,
      profit: Number((bal - start).toFixed(4)),
    }
  })
}

function maxDrawdown(balances: number[]) {
  let peak = balances[0] ?? 100
  let maxDd = 0
  for (const b of balances) {
    if (b > peak) peak = b
    const dd = peak > 0 ? ((peak - b) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

function useMonthlySeries(): Point[] {
  const { data: monthly } = useLandingMonthlySeries()
  return useMemo(
    () =>
      monthly.map((m) => {
        const parts = formatMonthParts(m.month)
        return {
          key: parts.key,
          label: parts.label,
          fullLabel: m.label || parts.fullLabel,
          value: m.returnPct,
        }
      }),
    [monthly],
  )
}

/**
 * Custom SVG monthly performance chart — full multi-year series with horizontal scroll.
 */
export function MonthlyPerformanceChart() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const gid = useId()
  const series = useMonthlySeries()
  const { stats: live } = useLandingLiveStats()
  const data = useMemo(() => buildGrowth(series), [series])
  const [active, setActive] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const slot = 56
  const H = 240
  const pad = { t: 20, r: 24, b: 36, l: 44 }
  const W = Math.max(640, pad.l + pad.r + Math.max(data.length - 1, 1) * slot)
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const min = data.length ? Math.min(...data.map((d) => d.endBalance)) * 0.96 : 0
  const max = data.length ? Math.max(...data.map((d) => d.endBalance)) * 1.02 : 1

  const coords = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW
    const y = pad.t + (1 - (d.endBalance - min) / (max - min || 1)) * innerH
    return { x, y, ...d }
  })

  const final = data.at(-1)
  const totalPct = final ? final.endBalance - 100 : 0
  const avgMonthly =
    data.length > 0 ? data.reduce((a, d) => a + d.value, 0) / data.length : 0
  const years = Math.max(data.length / 12, 1 / 12)
  const cagr = final
    ? (Math.pow(final.endBalance / 100, 1 / years) - 1) * 100
    : Number(live.yearlyReturn) || 0
  const mdd = maxDrawdown(data.map((d) => d.endBalance))

  const pickFromEvent = useCallback(
    (clientX: number) => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * W
      let best = 0
      let bestDist = Infinity
      coords.forEach((c, i) => {
        const dist = Math.abs(c.x - x)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setActive(best)
    },
    [coords, W],
  )

  if (data.length === 0) {
    return (
      <p className="text-body-sm text-fg-muted">Loading monthly performance history…</p>
    )
  }

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const area = `${line} L ${coords.at(-1)!.x} ${pad.t + innerH} L ${coords[0]!.x} ${pad.t + innerH} Z`
  const tip = active !== null ? coords[active] : null

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-fg-subtle">Growth of $100</p>
          <p className="text-stat-md mt-0.5 tabular-nums text-fg sm:text-stat-lg">
            ${final!.endBalance.toFixed(0)}{' '}
            <span className="text-body-sm font-normal text-profit">
              +{totalPct.toFixed(0)}%
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-[11px] text-fg-subtle sm:grid-cols-4 sm:text-caption">
          <p>
            CAGR{' '}
            <span className="tabular-nums text-fg">{cagr.toFixed(1)}%</span>
          </p>
          <p>
            Avg mo.{' '}
            <span className="tabular-nums text-fg">{avgMonthly.toFixed(1)}%</span>
          </p>
          <p>
            Max DD{' '}
            <span className="tabular-nums text-loss">−{mdd.toFixed(1)}%</span>
          </p>
          <p>
            Months{' '}
            <span className="tabular-nums text-fg">{data.length}</span>
          </p>
        </div>
      </div>

      <div className="h-[220px] w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x sm:h-[280px] lg:h-[360px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height="100%"
          className="min-h-[220px] touch-pan-x sm:min-h-[280px]"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Monthly performance growth chart across all historical months"
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
            <g key={c.key}>
              <circle
                cx={c.x}
                cy={c.y}
                r={active === i ? 5.5 : 3}
                fill={active === i ? '#5EF2C4' : '#12D6A0'}
                stroke="#07131C"
                strokeWidth="1.5"
              />
              {(i % Math.ceil(data.length / 12) === 0 || i === data.length - 1) && (
                <text
                  x={c.x}
                  y={H - 10}
                  textAnchor="middle"
                  fill="var(--text-tertiary)"
                  fontSize="10"
                >
                  {c.label}
                </text>
              )}
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
                x={Math.min(Math.max(tip.x - 84, 4), W - 176)}
                y={Math.max(tip.y - 92, 4)}
                width="168"
                height="88"
              >
                <div className="rounded-xl border border-glass-line bg-overlay/95 px-2.5 py-2 text-[11px] shadow-e3 backdrop-blur-md">
                  <p className="font-medium text-fg">{tip.fullLabel}</p>
                  <p
                    className={cn(
                      'mt-0.5 tabular-nums',
                      tip.value >= 0 ? 'text-profit' : 'text-loss',
                    )}
                  >
                    Monthly {tip.value >= 0 ? '+' : ''}
                    {tip.value.toFixed(2)}%
                  </p>
                  <p className="mt-1 tabular-nums text-fg-muted">
                    ${tip.startBalance.toFixed(2)} → ${tip.endBalance.toFixed(2)}
                  </p>
                  <p className="tabular-nums text-fg-subtle">
                    Profit {tip.profit >= 0 ? '+' : ''}${tip.profit.toFixed(2)}
                  </p>
                </div>
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-fg-subtle">
        Scroll or drag to inspect all {data.length} months
      </p>
    </div>
  )
}

/** Expandable monthly performance timeline across every year. */
export function MonthlyPerformanceTimeline() {
  const [open, setOpen] = useState<string | null>(null)
  const series = useMonthlySeries()
  const growth = useMemo(() => buildGrowth(series), [series])

  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-raised/50 p-3 sm:p-5">
      <h3 className="text-[15px] font-semibold text-fg">Monthly performance</h3>
      <p className="mt-0.5 text-[11px] text-fg-subtle">
        Every month across the full history — tap for starting/ending balance
      </p>
      <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
        {growth.map((m) => {
          const up = m.value >= 0
          const isOpen = open === m.key
          return (
            <li key={m.key} className="min-w-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.key)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  isOpen
                    ? 'border-accent-700 bg-accent-500/10'
                    : 'border-line bg-inset/40 hover:border-line-strong',
                )}
              >
                <span className="w-16 shrink-0 text-caption font-medium text-fg-muted sm:w-20">
                  {m.label}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-body-sm font-medium tabular-nums',
                    up ? 'text-profit' : 'text-loss',
                  )}
                >
                  {up ? '+' : ''}
                  {m.value.toFixed(2)}%
                </span>
                <span className="hidden shrink-0 text-caption tabular-nums text-fg-subtle sm:inline">
                  ${m.endBalance.toFixed(0)}
                </span>
              </button>
              {isOpen ? (
                <div className="mt-1.5 rounded-xl border border-line bg-raised/60 px-3 py-3 text-caption text-fg-muted">
                  <p className="font-medium text-fg">{m.fullLabel}</p>
                  <p className="mt-1">
                    Return{' '}
                    <span className="tabular-nums text-fg">
                      {up ? '+' : ''}
                      {m.value.toFixed(2)}%
                    </span>
                  </p>
                  <p className="mt-1 tabular-nums">
                    Start ${m.startBalance.toFixed(2)} · End ${m.endBalance.toFixed(2)} · Profit{' '}
                    {m.profit >= 0 ? '+' : ''}
                    ${m.profit.toFixed(2)}
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
