'use client'

import { useId, useMemo, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { SectionHeader } from '@/components/common/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useDemoCharts, useDemoDailyReturns } from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'

function ChartFrame({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card-fill min-w-0 p-4 sm:p-5', className)}>
      <SectionHeader title={title} description={description} as="h3" />
      <div className="mt-4 h-[240px] w-full min-w-0 sm:h-[280px]">{children}</div>
    </div>
  )
}

function EquityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload?: { returnPct?: number } }>
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  const day = payload[0].payload?.returnPct
  return (
    <div className="glass-strong rounded-xl border border-glass-line px-3 py-2 shadow-e3">
      <p className="text-caption text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-body-sm font-medium tabular-nums text-fg">
        Equity {Number(payload[0].value).toFixed(2)}
      </p>
      {typeof day === 'number' ? (
        <p className={cn('text-caption tabular-nums', day >= 0 ? 'text-profit' : 'text-loss')}>
          Day {day >= 0 ? '+' : ''}
          {day.toFixed(3)}%
        </p>
      ) : null}
    </div>
  )
}

function PctTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  const v = Number(payload[0].value)
  return (
    <div className="glass-strong rounded-xl border border-glass-line px-3 py-2 shadow-e3">
      <p className="text-caption text-fg-subtle">{label}</p>
      <p className={cn('mt-0.5 text-body-sm font-medium tabular-nums', v >= 0 ? 'text-profit' : 'text-loss')}>
        {v >= 0 ? '+' : ''}
        {v.toFixed(2)}%
      </p>
    </div>
  )
}

/** Equity curve + monthly bars + recent daily returns for the HPC. */
export function HpcCharts() {
  const equityGradientId = useId().replace(/:/g, '')
  const { data: charts, isLoading: chartsLoading, isError: chartsError } = useDemoCharts()
  const { data: daily = [], isLoading: dailyLoading } = useDemoDailyReturns()

  const equitySeries = useMemo(() => {
    const curve = charts?.equityCurve ?? []
    if (curve.length <= 180) return curve
    // Downsample for readability while keeping endpoints.
    const step = Math.ceil(curve.length / 180)
    const sampled = curve.filter((_, i) => i % step === 0 || i === curve.length - 1)
    return sampled
  }, [charts?.equityCurve])

  const monthlySeries = useMemo(
    () =>
      (charts?.monthlyReturns ?? []).map((m) => ({
        label: m.label.replace(/ 20/, " '"),
        fullLabel: m.label,
        returnPct: m.returnPct,
      })),
    [charts?.monthlyReturns],
  )

  const recentDaily = useMemo(() => {
    const last = daily.slice(-60)
    return last.map((d) => ({
      date: d.date.slice(5),
      fullDate: d.date,
      returnPct: d.netReturnPct,
    }))
  }, [daily])

  if (chartsLoading || dailyLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl lg:col-span-2" />
      </div>
    )
  }

  if (chartsError || !charts) {
    return (
      <p className="text-body-sm text-fg-subtle">
        Chart data is unavailable. Regenerate with{' '}
        <code className="text-caption">node demo-data/3-year-backtest/generate.mjs</code>.
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartFrame
        title="Equity curve"
        description={`Growth of ${charts.meta.startingEquity} → ${charts.meta.endingEquity.toFixed(1)} (${charts.meta.startDate} – ${charts.meta.endDate}).`}
        className="lg:col-span-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={equitySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={equityGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7C8F', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              tick={{ fill: '#6B7C8F', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<EquityTooltip />} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="rgb(52 211 153)"
              strokeWidth={2}
              fill={`url(#${equityGradientId})`}
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Monthly returns" description="Calendar-month net returns from the published programme history.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlySeries} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6B7C8F', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: '#6B7C8F', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const row = payload[0].payload as { fullLabel: string; returnPct: number }
                return (
                  <div className="glass-strong rounded-xl border border-glass-line px-3 py-2 shadow-e3">
                    <p className="text-caption text-fg-subtle">{row.fullLabel}</p>
                    <p className="mt-0.5 text-body-sm font-medium tabular-nums text-profit">
                      +{row.returnPct.toFixed(2)}%
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="returnPct" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
              {monthlySeries.map((entry) => (
                <Cell
                  key={entry.fullLabel}
                  fill={entry.returnPct >= 0 ? 'rgb(52 211 153 / 0.85)' : 'rgb(248 113 113 / 0.85)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Recent daily returns" description="Last 60 published settlement days.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={recentDaily} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7C8F', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: '#6B7C8F', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<PctTooltip />} />
            <Bar dataKey="returnPct" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={700}>
              {recentDaily.map((entry) => (
                <Cell
                  key={entry.fullDate}
                  fill={entry.returnPct >= 0 ? 'rgb(34 211 238 / 0.8)' : 'rgb(248 113 113 / 0.8)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
