'use client'

import { Fragment, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLandingLiveStats, useLandingMonthlySeries } from '@/features/landing'
import { buildGrowthOf100Rows } from '@/features/landing/live-stats'
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

const COLLAPSED_ROWS = 12

type GrowthRow = {
  month: string
  label: string
  returnPct: number
  portfolioValue: number
}

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

function formatMonthLabel(month: string, fallback?: string) {
  if (fallback) return fallback
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return month
  const year = match[1]!
  const idx = Number(match[2]) - 1
  const short = MONTH_SHORT[idx] ?? match[2]
  return `${short} ${year}`
}

function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

function formatUsd(n: number, digits = 2) {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
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

/** Cumulative growth path from monthly returns starting at 100. */
function buildGrowth(
  points: Array<{ key: string; label: string; fullLabel: string; value: number }>,
) {
  let bal = 100
  return points.map((p) => {
    const start = bal
    bal = Number((bal + 100 * (p.value / 100)).toFixed(4))
    return {
      ...p,
      startBalance: start,
      endBalance: bal,
      profit: Number((bal - start).toFixed(4)),
    }
  })
}

function useMonthlySeries(): Array<{
  key: string
  label: string
  fullLabel: string
  value: number
}> {
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
 * Growth of $100 — summary + monthly performance table/cards.
 * Replaces the compressed SVG equity line that could not be inspected on mobile.
 */
export function MonthlyPerformanceChart() {
  const { data: monthly = [], isLoading } = useLandingMonthlySeries()
  const { stats: live } = useLandingLiveStats()
  const [expanded, setExpanded] = useState(false)

  const chronological = useMemo(
    () =>
      [...monthly]
        .map((m) => ({
          month: m.month,
          returnPct: m.returnPct,
          label: m.label || formatMonthLabel(m.month),
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    [monthly],
  )

  const rows = useMemo(() => buildGrowthOf100Rows(chronological), [chronological])

  const summary = useMemo(() => {
    const last = rows.at(-1)
    const current = last?.portfolioValue ?? 100
    const totalGrowthPct = ((current - 100) / 100) * 100
    const avgMonthly =
      rows.length > 0 ? rows.reduce((acc, r) => acc + r.returnPct, 0) / rows.length : null
    const simpleAnnualized = avgMonthly != null ? avgMonthly * 12 : null
    return { current, totalGrowthPct, avgMonthly, months: rows.length, simpleAnnualized }
  }, [rows])

  const visible = useMemo(
    () => (expanded ? rows : rows.slice(-COLLAPSED_ROWS)),
    [expanded, rows],
  )
  const yearGroups = useMemo(() => groupRowsByYear(visible), [visible])

  if (isLoading || rows.length === 0) {
    return <p className="text-body-sm text-fg-muted">Loading monthly performance history…</p>
  }

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-fg-subtle">Growth of $100</p>
          <p className="text-stat-md mt-0.5 tabular-nums text-fg sm:text-stat-lg">
            {formatUsd(summary.current, 0)}{' '}
            <span className="text-body-sm font-normal text-profit">
              +{summary.totalGrowthPct.toFixed(0)}%
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-[11px] text-fg-subtle sm:grid-cols-4 sm:text-caption">
          <p>
            Ann. simple{' '}
            <span className="tabular-nums text-fg">
              {(summary.simpleAnnualized ?? (Number(live.yearlyReturn) || 0)).toFixed(1)}%
            </span>
          </p>
          <p>
            Avg mo.{' '}
            <span className="tabular-nums text-fg">
              {(summary.avgMonthly ?? (Number(live.avgMonthlyReturn) || 0)).toFixed(1)}%
            </span>
          </p>
          <p>
            Starting{' '}
            <span className="tabular-nums text-fg">$100.00</span>
          </p>
          <p>
            Months{' '}
            <span className="tabular-nums text-fg">{summary.months}</span>
          </p>
        </div>
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
            {summary.avgMonthly != null ? `${summary.avgMonthly.toFixed(1)}%` : '—'}
          </dd>
        </div>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <dt className="text-caption text-fg-subtle">Annualized simple return</dt>
          <dd className="mt-1 text-body-sm font-medium tabular-nums text-fg">
            {summary.simpleAnnualized != null ? `${summary.simpleAnnualized.toFixed(1)}%` : '—'}
          </dd>
        </div>
      </dl>

      <div className="min-w-0">
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
                      {formatMonthLabel(row.month, row.label).toUpperCase()}
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

        {/* Desktop / tablet: clean table */}
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
