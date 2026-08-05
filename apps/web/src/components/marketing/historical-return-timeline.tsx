'use client'

import { memo, useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { usePerformanceMonthly } from '@/features/performance/hooks'
import { cn } from '@/lib/cn'

type Range = 'monthly' | 'quarterly'

type BarPoint = {
  id: string
  label: string
  fullLabel: string
  returnPct: number
}

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

function compound(returns: number[]) {
  return (returns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
}

function buildMonthly(source: Array<{ month: string; returnPct: number }>): BarPoint[] {
  return source.map((m, i) => ({
    id: `m-${m.month}`,
    label: m.month,
    fullLabel: FULL_MONTHS[i] ?? m.month,
    returnPct: m.returnPct,
  }))
}

function buildQuarterly(monthly: BarPoint[]): BarPoint[] {
  const quarters: BarPoint[] = []
  for (let q = 0; q * 3 < monthly.length; q += 1) {
    const slice = monthly.slice(q * 3, q * 3 + 3)
    if (slice.length === 0) continue
    const returnPct = Number(compound(slice.map((s) => s.returnPct)).toFixed(1))
    quarters.push({
      id: `q-${q + 1}`,
      label: `Q${q + 1}`,
      fullLabel: `Quarter ${q + 1}`,
      returnPct,
    })
  }
  return quarters
}

const RANGES: { id: Range; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
]

function formatPct(n: number) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

/**
 * Interactive SVG historical return bars — published monthly performance only.
 * Renders nothing without a published series.
 */
export const HistoricalReturnTimeline = memo(function HistoricalReturnTimeline() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { data: monthlyData = [] } = usePerformanceMonthly()
  const gid = useId()
  const monthly = useMemo(
    () =>
      buildMonthly(
        monthlyData.map((m) => ({
          month: m.month,
          returnPct: Number.parseFloat(String(m.returnPct)) || 0,
        })),
      ),
    [monthlyData],
  )
  const quarterly = useMemo(() => buildQuarterly(monthly), [monthly])

  const [range, setRange] = useState<Range>('monthly')
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)

  const series = range === 'monthly' ? monthly : quarterly

  if (series.length === 0) return null

  const activeIndex = Math.min(selected, series.length - 1)
  const active = series[activeIndex]!
  const focus = hovered ?? activeIndex

  const W = 720
  const H = 220
  const pad = { t: 28, r: 16, b: 36, l: 44 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const maxAbs = Math.max(...series.map((s) => Math.abs(s.returnPct)), 1)
  const zeroY = pad.t + (maxAbs / (maxAbs * 2)) * innerH
  const slot = innerW / series.length
  const barW = Math.min(36, Math.max(14, slot * 0.55))

  const bars = series.map((s, i) => {
    const cx = pad.l + slot * i + slot / 2
    const mag = (Math.abs(s.returnPct) / maxAbs) * (innerH * 0.45)
    const up = s.returnPct >= 0
    const y = up ? zeroY - mag : zeroY
    const h = Math.max(mag, 4)
    return { ...s, i, cx, y, h, up }
  })

  const tip = bars[focus]!
  const tipX = Math.min(Math.max(tip.cx - 72, 8), W - 160)
  const tipY = Math.max(tip.up ? tip.y - 56 : tip.y + tip.h + 8, 8)

  function selectRange(next: Range) {
    setRange(next)
    setSelected(0)
    setHovered(null)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/10',
        'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_48px_rgba(0,0,0,0.28)]',
        'backdrop-blur-xl',
      )}
    >
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-overline text-accent-300">Historical return timeline</p>
          <p className="mt-1 text-heading-sm text-fg">Published programme archive</p>
        </div>

        <div
          className="inline-flex shrink-0 rounded-full border border-white/10 bg-inset/60 p-0.5"
          role="tablist"
          aria-label="Return range"
        >
          {RANGES.map((r) => {
            const on = range === r.id
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => selectRange(r.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base',
                  on
                    ? 'bg-accent-500/20 text-accent-200 shadow-[0_0_16px_-4px_rgba(18,214,160,0.55)]'
                    : 'text-fg-subtle hover:text-fg',
                )}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stat for selected period — fixed layout, no CLS */}
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="min-w-0 max-w-[10rem] rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[11px] text-fg-subtle">Return</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${range}-${active.id}`}
              className={cn(
                'mt-0.5 text-[15px] font-semibold tabular-nums sm:text-heading-sm',
                active.returnPct >= 0 ? 'text-profit' : 'text-loss',
              )}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {formatPct(active.returnPct)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Chart — fixed height viewport */}
      <div className="relative h-[200px] w-full min-w-0 overflow-x-auto overflow-y-hidden sm:h-[240px] [scrollbar-width:thin]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full min-w-0 touch-pan-x"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${active.fullLabel} return ${formatPct(active.returnPct)}`}
        >
          <defs>
            <linearGradient id={`${gid}-up`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0B6B52" />
              <stop offset="45%" stopColor="#12D6A0" />
              <stop offset="100%" stopColor="#5EF2C4" />
            </linearGradient>
            <linearGradient id={`${gid}-down`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F07178" />
              <stop offset="100%" stopColor="#8B2E36" />
            </linearGradient>
            <filter id={`${gid}-glow`} x="-60%" y="-40%" width="220%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
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
                stroke="rgba(255,255,255,0.06)"
              />
            )
          })}

          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(255,255,255,0.14)"
            strokeDasharray="4 5"
          />

          <AnimatePresence mode="wait">
            <motion.g
              key={range}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {bars.map((b) => {
                const isSel = b.i === activeIndex
                const isFocus = b.i === focus
                return (
                  <g key={b.id}>
                    <motion.rect
                      x={b.cx - barW / 2}
                      width={barW}
                      rx={6}
                      ry={6}
                      fill={b.up ? `url(#${gid}-up)` : `url(#${gid}-down)`}
                      opacity={isSel ? 1 : 0.4}
                      filter={isSel ? `url(#${gid}-glow)` : undefined}
                      initial={
                        prefersReducedMotion
                          ? false
                          : { height: 0, y: zeroY }
                      }
                      animate={{ height: b.h, y: b.y }}
                      transition={{
                        type: 'spring',
                        stiffness: 120,
                        damping: 18,
                        mass: 0.8,
                        delay: prefersReducedMotion ? 0 : b.i * 0.04,
                      }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(b.i)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(b.i)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setSelected(b.i)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${b.fullLabel}, ${formatPct(b.returnPct)}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelected(b.i)
                        }
                      }}
                    />
                    {/* Hit area */}
                    <rect
                      x={b.cx - slot / 2}
                      y={pad.t}
                      width={slot}
                      height={innerH}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(b.i)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setSelected(b.i)}
                    />
                    <text
                      x={b.cx}
                      y={H - 12}
                      textAnchor="middle"
                      fill={isSel ? 'rgba(94,242,196,0.95)' : 'rgba(148,163,184,0.85)'}
                      fontSize="11"
                      fontWeight={isSel ? 600 : 400}
                      style={{ pointerEvents: 'none' }}
                    >
                      {b.label}
                    </text>
                    {isFocus ? (
                      <text
                        x={b.cx}
                        y={b.up ? b.y - 8 : b.y + b.h + 14}
                        textAnchor="middle"
                        fill={b.up ? '#5EF2C4' : '#F07178'}
                        fontSize="11"
                        fontWeight={600}
                        style={{ pointerEvents: 'none' }}
                      >
                        {formatPct(b.returnPct)}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </motion.g>
          </AnimatePresence>

          <AnimatePresence>
            {tip ? (
              <motion.foreignObject
                key={`${tip.id}-tip`}
                x={tipX}
                y={tipY}
                width="152"
                height="48"
                initial={prefersReducedMotion ? false : { opacity: 0, y: tipY + 8 }}
                animate={{ opacity: 1, y: tipY }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ pointerEvents: 'none' }}
              >
                <div className="rounded-xl border border-white/10 bg-[rgb(12_22_32/0.92)] px-3 py-2.5 text-[11px] shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
                  <p className="font-semibold text-fg">{tip.fullLabel}</p>
                  <p className={cn('mt-1 tabular-nums', tip.up ? 'text-profit' : 'text-loss')}>
                    Return: {formatPct(tip.returnPct)}
                  </p>
                </div>
              </motion.foreignObject>
            ) : null}
          </AnimatePresence>
        </svg>
      </div>

      {/* Month / period chips */}
      <div className="border-t border-white/[0.06] px-3 py-3 sm:px-5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {series.map((s, i) => {
            const on = i === activeIndex
            const up = s.returnPct >= 0
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(i)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base',
                  on
                    ? 'border-accent-500/50 bg-accent-500/15 text-accent-200 shadow-[0_0_18px_-4px_rgba(18,214,160,0.65)]'
                    : 'border-white/[0.06] bg-white/[0.02] text-fg-subtle hover:border-white/15 hover:text-fg',
                )}
              >
                <span>{s.label}</span>
                <span className={cn('ml-1.5 tabular-nums', up ? 'text-profit' : 'text-loss')}>
                  {formatPct(s.returnPct)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="border-t border-white/[0.06] px-4 py-3 text-center text-[11px] leading-relaxed text-fg-subtle sm:px-6">
        Published historical performance. Past performance does not guarantee future results.
      </p>
    </div>
  )
})
