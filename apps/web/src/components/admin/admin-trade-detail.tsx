'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { useAdminTrades } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

export function AdminTradeDetail() {
  const params = useParams<{ tradeId: string }>()
  const tradeId = decodeURIComponent(params.tradeId)
  const { data, isLoading } = useAdminTrades()
  const trade = (data?.items ?? []).find((t) => t.id === tradeId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Trade" description="Loading…" />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="space-y-4">
        <PageHeader title="Trade not found" description={`No trade matches ${tradeId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.trades}>Back to trades</Link>
        </Button>
      </div>
    )
  }

  const profitPct = String(trade.returnPct)
  const negative = profitPct.trim().startsWith('-')
  const status = trade.isPublic ? 'PUBLISHED' : 'DRAFT'

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader
        title={`${trade.pair} · ${trade.direction}`}
        description="Published trade record. Amendments in production leave an audit trail."
        eyebrow={
          <Link href={ROUTES.admin.trades} className="hover:text-fg">
            ← Trades
          </Link>
        }
        actions={
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-1 text-caption font-medium',
              negative ? 'border-loss/25 bg-loss/15 text-loss' : 'border-profit/25 bg-profit/15 text-profit',
            )}
          >
            {status}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trade ID" value={trade.id} />
        <StatCard label="Trading day" value={trade.date} />
        <StatCard
          label="Profit %"
          value={`${negative ? '' : '+'}${profitPct}%`}
        />
        <StatCard label="Outcome" value={trade.outcome} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <AdminPanel>
          <AdminPanelHeader title="Position" />
          <dl className="grid gap-4 p-4 text-body-sm sm:grid-cols-2 sm:p-5">
            <div>
              <dt className="text-caption text-fg-subtle">Pair</dt>
              <dd className="mt-0.5 text-fg">{trade.pair}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Direction</dt>
              <dd className="mt-0.5 text-fg">{trade.direction}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Buy / Entry</dt>
              <dd className="mt-0.5 tabular-nums text-fg">{trade.entryPrice}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Sell / Exit</dt>
              <dd className="mt-0.5 tabular-nums text-fg">{trade.exitPrice}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-caption text-fg-subtle">Notes</dt>
              <dd className="mt-0.5 text-fg-muted">{trade.notes || '—'}</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Publication" />
          <dl className="space-y-3 p-4 text-body-sm sm:p-5">
            <div>
              <dt className="text-caption text-fg-subtle">Closed at</dt>
              <dd className="mt-0.5 text-fg">
                {trade.closedAt ? formatDateTime(trade.closedAt) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Visibility</dt>
              <dd className="mt-0.5 text-fg">{trade.isPublic ? 'Public' : 'Internal draft'}</dd>
            </div>
            <p className="text-caption text-fg-subtle">
              A published trade cannot be deleted. It can be marked archived in the trade manager.
            </p>
            <Button asChild size="sm" variant="glass">
              <Link href={ROUTES.admin.trades}>Edit in trade manager</Link>
            </Button>
          </dl>
        </AdminPanel>
      </div>
    </div>
  )
}
