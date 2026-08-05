'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Plus } from 'lucide-react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { useAdminTrades } from '@/features/admin/hooks'
import { cn } from '@/lib/cn'

export function AdminTradesWorkspace() {
  const { data, isLoading } = useAdminTrades()
  const trades = data?.items ?? []
  const todayIso = new Date().toISOString().slice(0, 10)
  const today = trades.filter((t) => t.date === todayIso)
  const netPct = today
    .reduce((sum, t) => sum + Number.parseFloat(String(t.returnPct)), 0)
    .toFixed(2)
  const drafts = trades.filter((t) => !t.isPublic).length

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Trades"
        description="Every position on the record. Publishing makes a trade visible to all investors."
        actions={
          <Button asChild>
            <Link href={ROUTES.admin.newTrade}>
              <Plus aria-hidden />
              Record a trade
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published trades" value={String(trades.filter((t) => t.isPublic).length)} />
        <StatCard label="Closed today" value={String(today.length)} />
        <StatCard label="Net % today" value={`${Number(netPct) >= 0 ? '+' : ''}${netPct}%`} />
        <StatCard label="Unpublished drafts" value={String(drafts)} />
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Trade log" description="Newest first. Open a row to view detail." />
        {isLoading ? (
          <p className="px-5 py-8 text-body-sm text-fg-muted">Loading trades…</p>
        ) : trades.length === 0 ? (
          <PremiumEmptyState
            title="No trades yet"
            description="Record and publish desk trades to show them to investors."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-caption">
              <thead className="border-b border-white/[0.06] text-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Pair</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Exit</th>
                  <th className="px-4 py-3 font-medium">Return</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium sm:px-5" />
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-fg">{t.pair}</p>
                      <p className="font-mono text-[11px] text-fg-muted">{t.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          t.direction === 'BUY'
                            ? 'border-profit/25 bg-profit/15 text-profit'
                            : 'border-loss/25 bg-loss/15 text-loss',
                        )}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">{t.entryPrice}</td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">{t.exitPrice}</td>
                    <td className="px-4 py-3 tabular-nums text-fg">{t.returnPct}%</td>
                    <td className="px-4 py-3 text-fg-muted">{t.isPublic ? 'Yes' : 'Draft'}</td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={ROUTES.admin.trade(t.id)}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
