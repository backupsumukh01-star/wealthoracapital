'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { useAdminReturns } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

function formatDuration(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function AdminReturnRunDetail() {
  const params = useParams<{ runId: string }>()
  const runId = decodeURIComponent(params.runId)
  const { data, isLoading } = useAdminReturns()
  const run = (data?.items ?? []).find((r) => r.id === runId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settlement" description="Loading…" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <PageHeader title="Run not found" description={`No settlement matches ${runId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.dailyReturn}>Back to daily return</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`Settlement ${run.date}`}
        description="The permanent record of one daily return: what was applied, to whom, and by whom."
        eyebrow={
          <Link href={ROUTES.admin.dailyReturn} className="hover:text-fg">
            ← Daily return
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Return figure" value={`+${run.returnPct}%`} />
        <StatCard label="Users processed" value={String(run.eligibleWallets)} />
        <StatCard label="Successful" value={String(run.successfulWallets ?? run.processedWallets)} />
        <StatCard label="Failed" value={String(run.failedWallets ?? 0)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total distributed"
          value={<Money value={run.totalDistributed} size="sm" />}
        />
        <StatCard label="Applied by" value={run.appliedBy ?? '—'} />
        <StatCard
          label="Started at"
          value={run.startedAt ? formatDateTime(run.startedAt) : '—'}
        />
        <StatCard
          label="Completed at"
          value={run.completedAt ? formatDateTime(run.completedAt) : run.status}
        />
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Run summary" description={`Trading day ${run.date}`} />
        <dl className="grid gap-4 p-4 text-body-sm sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-caption text-fg-subtle">Investment base</dt>
            <dd className="mt-0.5 text-fg">
              <Money value={run.totalBaseAmount} size="sm" />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Duration</dt>
            <dd className="mt-0.5 text-fg">{formatDuration(run.durationMs)}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Rounding delta</dt>
            <dd className="mt-0.5 text-fg">
              <Money value={run.roundingDelta} size="sm" />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Notes</dt>
            <dd className="mt-0.5 text-fg-muted">{run.notes?.trim() || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption text-fg-subtle">Run ID</dt>
            <dd className="mt-0.5 break-all font-mono text-[11px] text-fg-muted">{run.id}</dd>
          </div>
        </dl>
      </AdminPanel>
    </div>
  )
}
