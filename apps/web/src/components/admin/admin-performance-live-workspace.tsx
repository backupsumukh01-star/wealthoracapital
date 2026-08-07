'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { useQuery } from '@tanstack/react-query'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { adminService } from '@/services/admin.service'

function pct(value: unknown) {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return `${n.toFixed(2)}%`
}

function money(value: unknown) {
  if (value == null) return '—'
  return `$${String(value)}`
}

export function AdminPerformanceLiveWorkspace() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'performance', 'live'],
    queryFn: () => adminService.performance(),
    staleTime: 30_000,
  })

  const summary = (data?.summary ?? {}) as Record<string, unknown>
  const analytics = (data?.analytics ?? {}) as Record<string, unknown>
  const dailyReturns = data?.dailyReturns ?? []
  const bestDay = summary.bestDay as { date?: string; profit?: string } | null | undefined
  const worstDay = summary.worstDay as { date?: string; profit?: string } | null | undefined

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Performance"
        description="Live programme metrics from daily return runs and profit distributions — not marketing CMS drafts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="glass" onClick={() => void refetch()} disabled={isFetching}>
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.admin.dailyReturn}>Publish daily return</Link>
            </Button>
          </div>
        }
      />

      {isError ? (
        <AdminPanel className="p-4 text-caption text-danger sm:p-5">
          Could not load live performance from the API.
        </AdminPanel>
      ) : null}

      <AdminPanel>
        <AdminPanelHeader
          title="Headline metrics"
          description={isLoading ? 'Loading ledger…' : 'Computed from completed settlements'}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          {(
            [
              ['ROI', pct(summary.roiPct)],
              ['This month return', pct(summary.thisMonthReturnPct)],
              ['Last month return', pct(summary.lastMonthReturnPct)],
              ['Avg daily profit', money(summary.avgDailyReturnPct)],
              ['Win rate', pct(summary.winRatePct)],
              ['Active days', String(summary.activeDays ?? '—')],
              ['This month profit', money(summary.thisMonthProfit)],
              ['Best day', bestDay ? `${bestDay.date ?? '—'} · ${money(bestDay.profit)}` : '—'],
              ['Worst day', worstDay ? `${worstDay.date ?? '—'} · ${money(worstDay.profit)}` : '—'],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-caption text-fg-muted">{label}</p>
              <p className="mt-1 text-body-sm font-medium tabular-nums text-fg">{value}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel>
          <AdminPanelHeader title="Analytics snapshot" description="Programme-level analytics payload." />
          <dl className="grid gap-3 p-4 text-caption sm:grid-cols-2 sm:p-5">
            {Object.keys(analytics).length === 0 ? (
              <p className="text-fg-subtle">{isLoading ? 'Loading…' : 'No analytics rows yet.'}</p>
            ) : (
              Object.entries(analytics)
                .slice(0, 12)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-fg-subtle">{k}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-fg">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </dd>
                  </div>
                ))
            )}
          </dl>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader
            title="Recent daily returns"
            description="Settled programme days from the returns ledger."
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href={ROUTES.admin.dailyReturn}>Open desk</Link>
              </Button>
            }
          />
          <ul className="max-h-80 divide-y divide-white/[0.04] overflow-y-auto">
            {dailyReturns.length === 0 ? (
              <li className="px-4 py-6 text-caption text-fg-subtle sm:px-5">
                {isLoading ? 'Loading…' : 'No daily returns yet — publish from Daily Return.'}
              </li>
            ) : (
              dailyReturns.slice(0, 30).map((row, i) => {
                const r = row as {
                  id?: string
                  date?: string
                  returnPct?: string
                  status?: string
                  totalDistributed?: string
                  completedAt?: string
                }
                return (
                  <li key={r.id ?? `${r.date}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <div>
                      <p className="text-body-sm font-medium text-fg">{r.date ?? '—'}</p>
                      <p className="text-[11px] text-fg-subtle">
                        {r.status ?? '—'}
                        {r.completedAt ? ` · ${formatDateTime(r.completedAt)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm tabular-nums text-fg">{pct(r.returnPct)}</p>
                      <p className="text-[11px] tabular-nums text-fg-subtle">{money(r.totalDistributed)}</p>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </AdminPanel>
      </div>

      <AdminPanel className="p-4 text-caption text-fg-muted sm:p-5">
        Marketing headline stats for the landing page are edited under{' '}
        <Link className="text-accent-300 hover:underline" href={ROUTES.admin.frontendManagement}>
          Frontend Management
        </Link>
        .
      </AdminPanel>
    </div>
  )
}
