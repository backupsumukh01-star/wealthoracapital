'use client'

import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Skeleton } from '@/components/ui/skeleton'
import {
  equityYearTicks,
  formatChartDay,
  formatChartPct,
  formatChartUsd,
  formatChartYear,
  mapCanonicalEquityCurve,
  type PublicEquityChartPoint,
} from '@/features/landing/public-equity-chart'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useDemoCharts } from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: PublicEquityChartPoint }>
}) {
  if (!active || !payload?.[0]?.payload) return null
  const point = payload[0].payload
  return (
    <div className="max-w-[16rem] rounded-xl border border-glass-line bg-raised/95 px-3 py-2.5 shadow-e3 backdrop-blur-md">
      <p className="text-caption text-fg-subtle">Date</p>
      <p className="text-body-sm font-medium tabular-nums text-fg">{formatChartDay(point.date)}</p>
      <p className="mt-2 text-caption text-fg-subtle">Performance</p>
      <p
        className={cn(
          'text-body-sm font-medium tabular-nums',
          point.returnPct >= 0 ? 'text-profit' : 'text-loss',
        )}
      >
        {formatChartPct(point.returnPct)}
      </p>
      <p className="mt-2 text-caption text-fg-subtle">Portfolio Value</p>
      <p className="text-body-sm font-medium tabular-nums text-fg">{formatChartUsd(point.equity)}</p>
    </div>
  )
}

/** Homepage growth-of-$100 chart bound to the canonical public demo equityCurve. */
export function HeroVisual({ className }: { className?: string }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { data: charts, isLoading } = useDemoCharts()
  const gradientId = useId().replace(/:/g, '')
  const fillId = `hero-equity-fill-${gradientId}`
  const strokeId = `hero-equity-stroke-${gradientId}`

  const points = useMemo(() => mapCanonicalEquityCurve(charts?.equityCurve), [charts?.equityCurve])
  const ticks = useMemo(() => equityYearTicks(points), [points])
  const start = points[0]
  const end = points[points.length - 1]
  const meta = charts?.meta

  const yPad = useMemo(() => {
    if (points.length === 0) return 20
    const values = points.map((p) => p.equity)
    const min = Math.min(...values)
    const max = Math.max(...values)
    return Math.max((max - min) * 0.06, 8)
  }, [points])

  const label =
    start && end
      ? `Growth of $100 from ${formatChartDay(start.date)} to ${formatChartDay(end.date)}`
      : 'Growth of $100'

  return (
    <div className={cn('relative isolate w-full min-w-0', className)}>
      <div className="panel-luxury overflow-hidden p-4 shadow-e4 sm:p-6 lg:p-8">
        <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption text-fg-subtle">Growth of $100</p>
            <p className="mt-0.5 text-body-sm tabular-nums text-fg">
              {end
                ? formatChartUsd(end.equity)
                : meta?.endingEquity != null
                  ? formatChartUsd(meta.endingEquity)
                  : '—'}
              {meta?.totalReturnPct != null ? (
                <span className="ml-2 text-profit">{formatChartPct(meta.totalReturnPct)}</span>
              ) : null}
            </p>
          </div>
          <p className="text-caption tabular-nums text-fg-subtle">
            {meta?.startDate?.slice(0, 4) ?? '2022'} – {meta?.endDate?.slice(0, 4) ?? '2026'}
          </p>
        </div>

        <div
          className="h-48 w-full min-w-0 overflow-hidden sm:h-64 lg:h-72"
          role="img"
          aria-label={label}
        >
          {isLoading && points.length === 0 ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : points.length === 0 ? (
            <p className="grid h-full place-items-center text-body-sm text-fg-subtle">
              Performance history is unavailable.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-500)" />
                    <stop offset="100%" stopColor="var(--accent-200)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="ts"
                  domain={['dataMin', 'dataMax']}
                  ticks={ticks}
                  tickFormatter={formatChartYear}
                  tick={{ fill: '#89939E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={8}
                  interval={0}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  domain={[`dataMin - ${yPad}`, `dataMax + ${yPad}`]}
                  tick={{ fill: '#89939E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => `$${Math.round(Number(v))}`}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: 'var(--accent-300)', strokeOpacity: 0.35 }}
                  allowEscapeViewBox={{ x: false, y: true }}
                  wrapperStyle={{ outline: 'none', zIndex: 20, pointerEvents: 'none' }}
                  isAnimationActive={false}
                />
                <Area
                  type="linear"
                  dataKey="equity"
                  stroke={`url(#${strokeId})`}
                  strokeWidth={2.25}
                  fill={`url(#${fillId})`}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: 'var(--accent-200)',
                    stroke: 'var(--surface-raised)',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
