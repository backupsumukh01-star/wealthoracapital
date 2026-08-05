'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { useAdminReturns } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

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
        title={`Settlement ${run.id}`}
        description="The permanent record of one daily return: what was applied, to whom, and by whom."
        eyebrow={
          <Link href={ROUTES.admin.dailyReturn} className="hover:text-fg">
            ← Daily return
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Return figure" value={`+${run.returnPct}%`} />
        <StatCard label="Balances affected" value={String(run.eligibleWallets)} />
        <StatCard label="Total distributed" value={<Money value={run.totalDistributed} size="sm" />} />
        <StatCard label="Outcome" value={run.status} />
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Run summary" description={`Trading day ${run.date}`} />
        <dl className="grid gap-4 p-4 text-body-sm sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-caption text-fg-subtle">Processed wallets</dt>
            <dd className="mt-0.5 text-fg">{run.processedWallets}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Completed at</dt>
            <dd className="mt-0.5 text-fg">
              {run.completedAt ? formatDateTime(run.completedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Base amount</dt>
            <dd className="mt-0.5 text-fg">
              <Money value={run.totalBaseAmount} size="sm" />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Rounding delta</dt>
            <dd className="mt-0.5 text-fg">
              <Money value={run.roundingDelta} size="sm" />
            </dd>
          </div>
        </dl>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Per-investor effect"
          description="Ledger line items are not included on this run payload."
        />
        <div className="p-4 sm:p-5">
          <PremiumEmptyState
            title="Investor credits not loaded"
            description="This view shows the run totals only. Open the ledger or wallet tools for per-investor lines."
            variant="activity"
          />
        </div>
      </AdminPanel>
    </div>
  )
}
