'use client'

import { Fragment, useMemo, useState, type ReactNode } from 'react'
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

type GrowthRow = {
  month: string
  label: string
  returnPct: number
  portfolioValue: number
}

function yearFromMonthKey(month: string) {
  const match = /^(\d{4})-/.exec(month)
  return match?.[1] ?? month.slice(0, 4)
}

function groupRowsByYear(rows: GrowthRow[]) {
  const groups: Array<{ year: string; rows: GrowthRow[] }> = []
  for (const row of rows) {
    const year = yearFromMonthKey(row.month)
    const last = groups.at(-1)
    if (last && last.year === year) {
      last.rows.push(row)
    } else {
      groups.push({ year, rows: [row] })
    }
  }
  return groups
}

function formatMonthUpper(month: string, fallback?: string) {
  return formatMonthLabel(month, fallback).toUpperCase()
}

function formatUsd(n: number, digits = 2) {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

/**
 * Growth of $100 — summary + monthly performance table/cards.
 * No equity chart: mobile uses stacked cards; desktop uses a clean table.
 */
function GrowthOf100Timeline() {
  const { data: months = [], isLoading } = useHpcMonthlySeries()
  const { stats } = useHpcProgrammeStats()
  const [expanded, setExpanded] = useState(false)

  const chronological = useMemo(
    () => [...months].sort((a, b) => a.month.localeCompare(b.month)),
    [months],
  )

  const rows = useMemo(() => buildGrowthOf100Rows(chronological), [chronological])

  const summary = useMemo(() => {
    const last = rows.at(-1)
    const current = last?.portfolioValue ?? 100
    const totalGrowthPct = ((current - 100) / 100) * 100
    const avgMonthly =
      rows.length > 0 ? rows.reduce((acc, r) => acc + r.returnPct, 0) / rows.length : null
    const simpleAnnualized = avgMonthly != null ? avgMonthly * 12 : null
    return {
      current,
      totalGrowthPct,
      avgMonthly,
      months: rows.length,
      simpleAnnualized,
    }
  }, [rows])

  const visible = useMemo(
    () => (expanded ? rows : rows.slice(-COLLAPSED_ROWS)),
    [expanded, rows],
  )
  const yearGroups = useMemo(() => groupRowsByYear(visible), [visible])

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full rounded-2xl" />
  }

  if (rows.length === 0) {
    return (
      <div className="card-fill min-w-0 p-4 sm:p-5">
        <SectionHeader
          title="Growth of $100"
          description="Simple accumulated value from the published monthly programme returns."
          as="h3"
        />
        <p className="mt-4 text-body-sm text-fg-muted">No historical performance data available.</p>
      </div>
    )
  }

  const yearsLabel =
    stats.yearsOfPerformance !== '—'
      ? stats.yearsOfPerformance
      : String(Math.max(1, Math.round(summary.months / 12)))

  return (
    <div className="card-fill min-w-0 overflow-hidden p-4 sm:p-5">
      <SectionHeader
        title="Growth of $100"
        description={`Simple accumulated return from ${summary.months} published months · ${yearsLabel} year programme window.`}
        as="h3"
      />

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Starting value</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">$100.00</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Current value</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">
            {formatUsd(summary.current, 0)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Total growth</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-profit">
            +{summary.totalGrowthPct.toFixed(0)}%
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Average monthly return</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">
            {summary.avgMonthly != null
              ? `${summary.avgMonthly.toFixed(1)}%`
              : stats.avgMonthlyReturn !== '—'
                ? `${stats.avgMonthlyReturn}%`
                : '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Months</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">{summary.months}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-fg-subtle">Annualized simple return</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">
            {summary.simpleAnnualized != null
              ? `${summary.simpleAnnualized.toFixed(1)}%`
              : stats.yearlyReturn !== '—'
                ? `${stats.yearlyReturn}%`
                : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 min-w-0">
        <h4 className="text-heading-sm text-fg">Monthly Performance</h4>
        <p className="mt-1 text-caption text-fg-subtle">
          {expanded
            ? `All ${summary.months} months from the published programme history.`
            : `Latest ${Math.min(COLLAPSED_ROWS, summary.months)} months · simple growth of $100.`}
        </p>

        {/* Mobile: stacked month cards — no horizontal page scroll */}
        <div className="mt-4 space-y-4 sm:hidden">
          {yearGroups.map((group) => (
            <div key={group.year} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-caption font-medium uppercase tracking-wide text-fg-subtle">
                  {group.year}
                </p>
                <p className="text-caption tabular-nums text-fg-muted">
                  {group.rows.length} {group.rows.length === 1 ? 'month' : 'months'}
                </p>
              </div>
              <ul className="space-y-2">
                {group.rows.map((row) => (
                  <li
                    key={row.month}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                  >
                    <p className="text-body-sm font-medium tracking-wide text-fg">
                      {formatMonthUpper(row.month, row.label)}
                    </p>
                    <dl className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-caption text-fg-subtle">Monthly return</dt>
                        <dd
                          className={cn(
                            'text-body-sm tabular-nums',
                            row.returnPct >= 0 ? 'text-profit' : 'text-loss',
                          )}
                        >
                          {formatPct(row.returnPct, 2)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-caption text-fg-subtle">Growth of $100</dt>
                        <dd className="text-body-sm tabular-nums text-fg">
                          {formatUsd(row.portfolioValue, 2)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Desktop / tablet: professional table inside the card */}
        <div className="mt-4 hidden min-w-0 overflow-x-auto overscroll-contain sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Year</TableHead>
                <TableHead className="text-right">Monthly Return</TableHead>
                <TableHead className="text-right">Growth of $100</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearGroups.map((group) => (
                <Fragment key={group.year}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="bg-white/[0.02] py-2 text-caption font-medium uppercase tracking-wide text-fg-subtle"
                    >
                      {group.year}
                      <span className="ml-2 font-normal normal-case tracking-normal text-fg-muted">
                        {group.rows.length} {group.rows.length === 1 ? 'month' : 'months'}
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.rows.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">
                        {formatMonthLabel(row.month, row.label)}
                      </TableCell>
                      <TableCell className="hidden tabular-nums text-fg-muted md:table-cell">
                        {group.year}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          row.returnPct >= 0 ? 'text-profit' : 'text-loss',
                        )}
                      >
                        {formatPct(row.returnPct, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-fg">
                        {formatUsd(row.portfolioValue, 2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {rows.length > COLLAPSED_ROWS ? (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show less ↑' : `Show all ${rows.length} months ↓`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Monthly bars + recent daily returns + Growth of $100 monthly table for the HPC. */
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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Keep Growth of $100 mounted so expand/collapse state is not reset by chart loading. */}
      <div className="min-w-0 lg:col-span-2">
        <GrowthOf100Timeline />
      </div>

      {dailyLoading || monthlyLoading ? (
        <>
          <Skeleton className="h-[320px] rounded-2xl" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </>
      ) : (
        <>
          {monthlySeries.length > 0 ? (
            <ChartFrame
              title="Monthly returns"
              description="Calendar-month net returns from the published programme history."
            >
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
                        fill={
                          entry.returnPct >= 0 ? 'rgb(52 211 153 / 0.85)' : 'rgb(248 113 113 / 0.85)'
                        }
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
                        fill={
                          entry.returnPct >= 0 ? 'rgb(34 211 238 / 0.8)' : 'rgb(248 113 113 / 0.8)'
                        }
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
        </>
      )}
    </div>
  )
}
