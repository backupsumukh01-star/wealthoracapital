'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { ADMIN_INVESTORS, ADMIN_RETURN_HISTORY } from '@/lib/admin-demo-data'
import { formatDateTime } from '@/lib/format'

export function AdminReturnRunDetail() {
  const params = useParams<{ runId: string }>()
  const runId = decodeURIComponent(params.runId)
  const run = ADMIN_RETURN_HISTORY.find((r) => r.id === runId)

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

  const sample = ADMIN_INVESTORS.filter((i) => i.accountStatus === 'VERIFIED').slice(0, 6)
  const pct = Number.parseFloat(run.returnPct)

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
        <StatCard label="Total distributed" value={<Money value={run.distributed} size="sm" />} />
        <StatCard label="Outcome" value={run.status} />
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Run summary" description={`Trading day ${run.tradingDay}`} />
        <dl className="grid gap-4 p-4 text-body-sm sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-caption text-fg-subtle">Published by</dt>
            <dd className="mt-0.5 text-fg">{run.publishedBy ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Published at</dt>
            <dd className="mt-0.5 text-fg">
              {run.publishedAt ? formatDateTime(run.publishedAt) : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption text-fg-subtle">Notes</dt>
            <dd className="mt-0.5 text-fg-muted">{run.notes || '—'}</dd>
          </div>
        </dl>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Per-investor effect (sample)"
          description="Demo slice of verified wallets — full ledger not loaded in mock mode."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Investor</th>
                <th className="px-4 py-3 font-medium">Balance before</th>
                <th className="px-4 py-3 font-medium">Credit</th>
                <th className="px-4 py-3 font-medium sm:px-5">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((inv) => {
                const before = Number.parseFloat(inv.walletBalance)
                const credit = (before * pct) / 100
                const after = before + credit
                return (
                  <tr key={inv.userId} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-fg">
                        {inv.firstName} {inv.lastName}
                      </p>
                      <p className="font-mono text-[11px] text-fg-muted">{inv.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Money value={inv.walletBalance} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-profit">
                      <Money value={credit.toFixed(2)} size="sm" signed />
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <Money value={after.toFixed(2)} size="sm" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
