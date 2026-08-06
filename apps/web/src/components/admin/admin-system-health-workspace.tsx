'use client'

import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { useAdminHealth } from '@/features/admin/hooks'
import type { HealthTone } from '@/lib/admin-cms-extras'
import { cn } from '@/lib/cn'
import type { AdminHealthSnapshot } from '@/types/domain'

const TONE: Record<HealthTone, string> = {
  healthy: 'border-profit/30 bg-profit/10 text-profit',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  critical: 'border-loss/40 bg-loss/15 text-loss',
}

const DOT: Record<HealthTone, string> = {
  healthy: 'bg-profit',
  warning: 'bg-amber-400',
  critical: 'bg-loss',
}

const EMPTY_HEALTH: AdminHealthSnapshot = {
  refreshedAt: new Date(0).toISOString(),
  version: '—',
  environment: 'production',
  metrics: [],
  logs: { system: [], audit: [], errors: [] },
}

const GROUPS = [
  { id: 'infra', title: 'Infrastructure' },
  { id: 'services', title: 'Services & queues' },
  { id: 'ops', title: 'Operations' },
  { id: 'security', title: 'Logs & audit' },
] as const

function LogTable({
  rows,
  empty,
}: {
  rows: Array<{ id: string; at: string; primary: string; secondary: string }>
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-caption text-fg-subtle sm:px-5">{empty}</p>
  }
  return (
    <ul className="divide-y divide-white/[0.05]">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-body-sm text-fg">{r.primary}</p>
            <p className="truncate text-caption text-fg-muted">{r.secondary}</p>
          </div>
          <p className="shrink-0 text-[11px] tabular-nums text-fg-subtle">
            {r.at.slice(0, 19).replace('T', ' ')}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function AdminSystemHealthWorkspace() {
  const { data, isFetching, refetch, isError } = useAdminHealth()
  const h = data ?? EMPTY_HEALTH

  useEffect(() => {
    const id = window.setInterval(() => {
      void refetch()
    }, 30_000)
    return () => window.clearInterval(id)
  }, [refetch])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="System Health"
        description="Live production metrics — API, database, Redis, queues, storage, money flows, and logs."
        actions={
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={isFetching}
            onClick={async () => {
              const result = await refetch()
              if (result.error) {
                toast.error('Could not refresh health metrics')
              } else {
                toast.success('Health metrics refreshed')
              }
            }}
          >
            <RefreshCw aria-hidden className={cn(isFetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {isError ? (
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <PremiumEmptyState
              title="Health API unavailable"
              description="GET /admin/health failed. Check operator session and API connectivity."
            />
          </div>
        </AdminPanel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">System version</p>
            <p className="mt-1 text-heading-sm text-fg">{h.version}</p>
          </div>
        </AdminPanel>
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">Environment</p>
            <p className="mt-1 text-heading-sm uppercase tracking-wide text-fg">{h.environment}</p>
          </div>
        </AdminPanel>
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">Last refresh</p>
            <p className="mt-1 text-heading-sm tabular-nums text-fg">
              {h.refreshedAt.slice(0, 19).replace('T', ' ')} UTC
            </p>
          </div>
        </AdminPanel>
      </div>

      {h.widgets?.stability ? (
        <AdminPanel>
          <AdminPanelHeader
            title="Reliability"
            description="Uptime, latency, deploy identity, and recent crash buffer."
          />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
            {[
              ['API uptime', `${h.widgets.stability.apiUptimeSeconds}s`],
              ['DB uptime', `${h.widgets.stability.databaseUptimeSeconds}s`],
              [
                'Avg response',
                h.widgets.stability.averageResponseMs != null
                  ? `${h.widgets.stability.averageResponseMs} ms`
                  : '—',
              ],
              ['Restarts', String(h.widgets.stability.restartCount)],
              ['Errors', String(h.widgets.stability.errorCount)],
              [
                'Disk',
                h.widgets.stability.diskUsedPct != null
                  ? `${h.widgets.stability.diskUsedPct}%`
                  : 'n/a',
              ],
              ['Git', h.widgets.stability.gitCommit.slice(0, 10)],
              ['Instance', h.widgets.stability.renderInstance],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-caption text-fg-subtle">{label}</p>
                <p className="mt-1 truncate text-body-sm font-medium text-fg">{value}</p>
              </div>
            ))}
          </div>
          {(h.widgets.stability.recentCrashes?.length ?? 0) > 0 ? (
            <LogTable
              empty=""
              rows={h.widgets.stability.recentCrashes.map((c) => ({
                id: c.id,
                at: c.at,
                primary: c.message,
                secondary: c.kind,
              }))}
            />
          ) : null}
        </AdminPanel>
      ) : null}

      {h.metrics.length === 0 && !isError ? (
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <PremiumEmptyState
              title="No health metrics yet"
              description="Metrics will appear here once the backend probes respond."
            />
          </div>
        </AdminPanel>
      ) : null}

      {GROUPS.filter((g) => h.metrics.some((m) => m.group === g.id)).map((g) => (
        <AdminPanel key={g.id}>
          <AdminPanelHeader title={g.title} />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {h.metrics
              .filter((m) => m.group === g.id)
              .map((m) => (
                <article
                  key={m.id}
                  className={cn('rounded-2xl border p-4 transition-colors', TONE[m.tone])}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-caption opacity-80">{m.label}</p>
                    <span className={cn('mt-1 size-2 shrink-0 rounded-full', DOT[m.tone])} />
                  </div>
                  <p className="mt-2 text-heading-sm text-fg">{m.value}</p>
                  <p className="mt-1 text-caption text-fg-muted">{m.detail}</p>
                </article>
              ))}
          </div>
        </AdminPanel>
      ))}

      <div className="grid gap-4 xl:grid-cols-3">
        <AdminPanel>
          <AdminPanelHeader title="System Logs" description="Recent in-process API events." />
          <LogTable
            empty="No system log entries buffered yet."
            rows={(h.logs?.system ?? []).map((l) => ({
              id: l.id,
              at: l.at,
              primary: l.message,
              secondary: l.level.toUpperCase(),
            }))}
          />
        </AdminPanel>
        <AdminPanel>
          <AdminPanelHeader title="Audit Logs" description="Latest rows from audit_logs." />
          <LogTable
            empty="No audit entries."
            rows={(h.logs?.audit ?? []).map((l) => ({
              id: l.id,
              at: l.at,
              primary: `${l.module} · ${l.action}`,
              secondary: l.actorId ? `actor ${l.actorId.slice(0, 8)}…` : 'system',
            }))}
          />
        </AdminPanel>
        <AdminPanel>
          <AdminPanelHeader title="Error Logs" description="Buffered 5xx and job failures." />
          <LogTable
            empty="No recent errors."
            rows={(h.logs?.errors ?? []).map((l) => ({
              id: l.id,
              at: l.at,
              primary: l.message,
              secondary: l.level.toUpperCase(),
            }))}
          />
        </AdminPanel>
      </div>
    </div>
  )
}
