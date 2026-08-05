'use client'

import { SectionHeader } from '@/components/common/page-header'
import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { Card } from '@/components/ui/card'
import { usePerformanceSummary } from '@/features/performance/hooks'
import { formatDate } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

export function PerformanceSummary() {
  const { session } = useSession()
  const { data: summary, isLoading } = usePerformanceSummary({ enabled: Boolean(session) })

  const rows = [
    {
      label: 'This month',
      value: summary ? <Percent value={summary.thisMonthReturnPct} showArrow /> : '—',
    },
    {
      label: 'Last month',
      value: summary ? <Percent value={summary.lastMonthReturnPct} showArrow /> : '—',
    },
    {
      label: 'Lifetime ROI',
      value: summary ? <Percent value={summary.roiPct} showArrow /> : '—',
    },
    {
      label: 'Best day',
      value: summary?.bestDay ? (
        <span className="flex flex-col items-end gap-0.5">
          <Percent value={summary.bestDay.returnPct} showArrow />
          <span className="text-caption text-fg-subtle">
            {formatDate(summary.bestDay.date)} ·{' '}
            <Money value={summary.bestDay.profit} signed size="sm" />
          </span>
        </span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Worst day',
      value: summary?.worstDay ? (
        <span className="flex flex-col items-end gap-0.5">
          <Percent value={summary.worstDay.returnPct} showArrow />
          <span className="text-caption text-fg-subtle">
            {formatDate(summary.worstDay.date)} ·{' '}
            <Money value={summary.worstDay.profit} signed size="sm" />
          </span>
        </span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Avg daily return',
      value: summary ? <Percent value={summary.avgDailyReturnPct} showArrow /> : '—',
    },
  ]

  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Historical performance"
        description="Returns across the periods that matter."
        as="h3"
      />

      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading performance…</p>
      ) : !summary ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No performance data yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-4 py-3">
                <span className="text-body-sm text-fg-muted">{row.label}</span>
                <div className="text-body-sm font-medium text-fg">{row.value}</div>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-caption text-fg-subtle">
            Win rate <span className="text-fg">{summary.winRatePct}%</span> · past
            performance does not guarantee future results.
          </p>
        </>
      )}
    </Card>
  )
}
