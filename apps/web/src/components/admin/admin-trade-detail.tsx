'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'
import { ADMIN_TRADES } from '@/lib/admin-demo-data'

export function AdminTradeDetail() {
  const params = useParams<{ tradeId: string }>()
  const tradeId = decodeURIComponent(params.tradeId)
  const { state } = useAdminOs()
  const fromOs = state.trades.find((t) => t.id === tradeId)
  const legacy = ADMIN_TRADES.find((t) => t.id === tradeId)

  if (!fromOs && !legacy) {
    return (
      <div className="space-y-4">
        <PageHeader title="Trade not found" description={`No trade matches ${tradeId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.trades}>Back to trades</Link>
        </Button>
      </div>
    )
  }

  const trade = fromOs
    ? {
        id: fromOs.id,
        pair: fromOs.pair,
        direction: fromOs.direction,
        entry: fromOs.entry,
        exit: fromOs.exit,
        profitPct: fromOs.profitPct,
        tradingDay: fromOs.tradingDay,
        notes: fromOs.notes,
        publishedAt: fromOs.publishedAt ?? fromOs.createdAt,
        publishedBy: 'ops@growzy.com',
        status: fromOs.status,
        risk: fromOs.risk,
      }
    : {
        id: legacy!.id,
        pair: legacy!.pair,
        direction: legacy!.direction,
        entry: legacy!.entry,
        exit: legacy!.exit,
        profitPct: legacy!.profitPct,
        tradingDay: legacy!.tradingDay,
        notes: legacy!.notes,
        publishedAt: legacy!.publishedAt,
        publishedBy: legacy!.publishedBy,
        status: 'PUBLISHED' as const,
        risk: '—',
      }

  const negative = trade.profitPct.trim().startsWith('-')

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
            {trade.status}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trade ID" value={trade.id} />
        <StatCard label="Trading day" value={trade.tradingDay} />
        <StatCard
          label="Profit %"
          value={`${negative ? '' : '+'}${trade.profitPct}%`}
        />
        <StatCard label="Risk" value={trade.risk} />
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
              <dd className="mt-0.5 tabular-nums text-fg">{trade.entry}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Sell / Exit</dt>
              <dd className="mt-0.5 tabular-nums text-fg">{trade.exit}</dd>
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
              <dt className="text-caption text-fg-subtle">Published at</dt>
              <dd className="mt-0.5 text-fg">{formatDateTime(trade.publishedAt)}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Published by</dt>
              <dd className="mt-0.5 text-fg">{trade.publishedBy}</dd>
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
