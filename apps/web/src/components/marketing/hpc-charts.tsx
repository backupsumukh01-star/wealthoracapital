'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHpcMonthlySeries, useHpcProgrammeStats } from '@/features/hpc/use-hpc-data'
import { buildGrowthOf100Rows } from '@/features/landing/live-stats'
import { useDemoDailyReturns } from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'

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

function formatMonthLabel(month: string, fallback?: string) {
  if (fallback) return fallback
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return month
  const year = match[1]!
  const idx = Number(match[2]) - 1
  const short = MONTH_SHORT[idx] ?? match[2]
  return `${short} ${year}`
}

function formatPct(n: number, digits = 1) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

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

const COLLAPSED_ROWS = 12

/**
 * Growth of $100 — compounded from the published monthly series.
 * Table/timeline replaces the hard-to-read equity line chart on mobile.
 */
function GrowthOf100Timeline() {
  const { data: months = [], isLoading } = useHpcMonthlySeries()
  const { stats } = useHpcProgrammeStats()
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => buildGrowthOf100Rows(months), [months])

  const summary = useMemo(() => {
    const last = rows.at(-1)
    const current = last?.portfolioValue ?? 100
    const totalGrowthPct = current - 100
    const avgMonthly =
      rows.length > 0 ? rows.reduce((acc, r) => acc + r.returnPct, 0) / rows.length : null
    return {
      starting: 100,
      current,
      totalGrowthPct,
      avgMonthly,
      months: rows.length,
    }
  }, [rows])

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full rounded-2xl" />
  }

  if (rows.length === 0) {
    return (
      <div className="card-fill min-w-0 p-4 sm:p-5">
        <SectionHeader
          title="Growth of $100"
          description="Compounded portfolio value from the published monthly programme returns."
          as="h3"
        />
        <p className="mt-4 text-body-sm text-fg-muted">No historical performance data available.</p>
      </div>
    )
  }

  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)
  const yearsLabel =
    stats.yearsOfPerformance !== '—' ? stats.yearsOfPerformance : String(Math.round(summary.months / 12))

  return (
    <div className="card-fill min-w-0 overflow-hidden p-4 sm:p-5">
      <SectionHeader
        title="Growth of $100"
        description={`Compounded from ${summary.months} published months · ${yearsLabel} year programme window.`}
        as="h3"
      />

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Starting value</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">$100</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Current value</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">
            ${summary.current.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Total growth</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-profit">
            +{summary.totalGrowthPct.toFixed(0)}%
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Avg monthly return</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">
            {summary.avgMonthly != null
              ? `${summary.avgMonthly.toFixed(1)}%`
              : stats.avgMonthlyReturn !== '—'
                ? `${stats.avgMonthlyReturn}%`
                : '—'}
          </dd>
        </div>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <dt className="text-caption text-fg-subtle">Months</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">{summary.months}</dd>
        </div>
      </dl>

      {/* Mobile: stacked month cards — no page-wide horizontal scroll */}
      <ul className="mt-5 max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain sm:hidden">
        {visible.map((row) => (
          <li
            key={row.month}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
          >
            <span className="min-w-0 truncate text-body-sm text-fg">
              {formatMonthLabel(row.month, row.label)}
            </span>
            <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
              <span className={cn('text-body-sm', row.returnPct >= 0 ? 'text-profit' : 'text-loss')}>
                {formatPct(row.returnPct, 1)}
              </span>
              <span className="min-w-[4.5rem] text-right text-body-sm text-fg">
                ${row.portfolioValue.toFixed(2)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet: professional table */}
      <div className="mt-5 hidden max-h-[32rem] overflow-y-auto overscroll-contain sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Portfolio value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{formatMonthLabel(row.month, row.label)}</TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    row.returnPct >= 0 ? 'text-profit' : 'text-loss',
                  )}
                >
                  {formatPct(row.returnPct, 1)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-fg">
                  ${row.portfolioValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rows.length > COLLAPSED_ROWS ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `View all ${rows.length} months`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Monthly bars + recent daily returns + Growth of $100 timeline for the HPC. */
export function HpcCharts() {
  const { data: daily = [], isLoading: dailyLoading } = useDemoDailyReturns()
  const { data: monthly = [], isLoading: monthlyLoading } = useHpcMonthlySeries()

  const monthlySeries = useMemo(
    () =>
      monthly.map((m) => ({
        label: formatMonthLabel(m.month, m.label).replace(/ 20/, " '"),
        fullLabel: formatMonthLabel(m.month, m.label),
        returnPct: m.returnPct,
      })),
    [monthly],
  )

  const recentDaily = useMemo(() => {
    const last = daily.slice(-60)
    return last.map((d) => ({
      date: d.date.slice(5),
      fullDate: d.date,
      returnPct: d.netReturnPct,
    }))
  }, [daily])

  if (dailyLoading || monthlyLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[420px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 lg:col-span-2">
        <GrowthOf100Timeline />
      </div>

      {monthlySeries.length > 0 ? (
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
                      <p
                        className={cn(
                          'mt-0.5 text-body-sm font-medium tabular-nums',
                          row.returnPct >= 0 ? 'text-profit' : 'text-loss',
                        )}
                      >
                        {row.returnPct >= 0 ? '+' : ''}
                        {row.returnPct.toFixed(2)}%
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
      ) : (
        <div className="card-fill p-4 sm:p-5">
          <p className="text-body-sm text-fg-muted">No historical performance data available.</p>
        </div>
      )}

      {recentDaily.length > 0 ? (
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
      ) : (
        <div className="card-fill p-4 sm:p-5">
          <p className="text-body-sm text-fg-muted">No historical performance data available.</p>
        </div>
      )}
    </div>
  )
}
