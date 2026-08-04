'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Plus } from 'lucide-react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { ADMIN_TRADES } from '@/lib/admin-demo-data'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

export function AdminTradesWorkspace() {
  const today = ADMIN_TRADES.filter((t) => t.tradingDay === '2026-08-02')
  const netPct = today
    .reduce((sum, t) => sum + Number.parseFloat(t.profitPct), 0)
    .toFixed(2)

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
        <StatCard label="Published trades" value={String(ADMIN_TRADES.length)} />
        <StatCard label="Closed (Aug 2)" value={String(today.length)} />
        <StatCard label="Net % (Aug 2)" value={`+${netPct}%`} />
        <StatCard label="Unpublished drafts" value="0" />
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Trade log" description="Newest first. Open a row to view detail." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Pair</th>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">Profit</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {ADMIN_TRADES.map((t) => (
                <tr key={t.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-fg">{t.pair}</p>
                    <p className="font-mono text-[11px] text-fg-muted">{t.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        t.direction === 'LONG'
                          ? 'border-profit/25 bg-profit/15 text-profit'
                          : 'border-loss/25 bg-loss/15 text-loss',
                      )}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-fg-muted">{t.entry}</td>
                  <td className="px-4 py-3 tabular-nums text-fg-muted">{t.exit}</td>
                  <td className="px-4 py-3">
                    <p className="tabular-nums text-profit">+{t.profitPct}%</p>
                    <Money value={t.profitUsd} size="sm" className="text-fg-subtle" />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {formatDateTime(t.publishedAt)}
                    <span className="mt-0.5 block text-[11px] text-fg-subtle">{t.publishedBy}</span>
                  </td>
                  <td className="px-4 py-3 text-right sm:px-5">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={ROUTES.admin.trade(t.id)}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
