'use client'

import { SectionHeader } from '@/components/common/page-header'
import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { Card } from '@/components/ui/card'
import { PERFORMANCE_SUMMARY } from '@/lib/dashboard-data'
import { formatDate } from '@/lib/format'

const ROWS = [
  { label: 'Today’s return', value: <Percent value={PERFORMANCE_SUMMARY.todayReturnPct} showArrow /> },
  { label: 'Weekly return', value: <Percent value={PERFORMANCE_SUMMARY.weeklyReturnPct} showArrow /> },
  { label: 'Monthly return', value: <Percent value={PERFORMANCE_SUMMARY.monthlyReturnPct} showArrow /> },
  { label: 'Yearly return', value: <Percent value={PERFORMANCE_SUMMARY.yearlyReturnPct} showArrow /> },
  {
    label: 'Best day',
    value: (
      <span className="flex flex-col items-end gap-0.5">
        <Percent value={PERFORMANCE_SUMMARY.bestDay.returnPct} showArrow />
        <span className="text-caption text-fg-subtle">
          {formatDate(PERFORMANCE_SUMMARY.bestDay.date)} ·{' '}
          <Money value={PERFORMANCE_SUMMARY.bestDay.profit} signed size="sm" />
        </span>
      </span>
    ),
  },
  {
    label: 'Worst day',
    value: (
      <span className="flex flex-col items-end gap-0.5">
        <Percent value={PERFORMANCE_SUMMARY.worstDay.returnPct} showArrow />
        <span className="text-caption text-fg-subtle">
          {formatDate(PERFORMANCE_SUMMARY.worstDay.date)} ·{' '}
          <Money value={PERFORMANCE_SUMMARY.worstDay.profit} signed size="sm" />
        </span>
      </span>
    ),
  },
  {
    label: 'Avg daily return',
    value: <Percent value={PERFORMANCE_SUMMARY.avgDailyReturnPct} showArrow />,
  },
]

export function PerformanceSummary() {
  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Historical performance"
        description="Returns across the periods that matter."
        as="h3"
      />

      <ul className="divide-y divide-line">
        {ROWS.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-body-sm text-fg-muted">{row.label}</span>
            <div className="text-body-sm font-medium text-fg">{row.value}</div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-caption text-fg-subtle">
        Win rate <span className="text-fg">{PERFORMANCE_SUMMARY.winRatePct}%</span> · past
        performance does not guarantee future results.
      </p>
    </Card>
  )
}
