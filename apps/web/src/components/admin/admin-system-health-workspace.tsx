'use client'

import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import type { HealthTone } from '@/lib/admin-cms-extras'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

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

/** Demo System Health dashboard — wired for future backend probes. */
export function AdminSystemHealthWorkspace() {
  const { state, refreshSystemHealth } = useAdminOs()
  const h = state.systemHealth

  const groups = [
    { id: 'infra' as const, title: 'Infrastructure' },
    { id: 'services' as const, title: 'Services' },
    { id: 'ops' as const, title: 'Operations' },
    { id: 'security' as const, title: 'Security & audit' },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="System Health"
        description="Live operational signals for database, API, jobs, queues, and money queues. Demo metrics refresh locally until backend probes connect."
        actions={
          <Button
            type="button"
            variant="glass"
            size="sm"
            onClick={() => {
              refreshSystemHealth()
              toast.success('Health metrics refreshed')
            }}
          >
            <RefreshCw aria-hidden />
            Refresh
          </Button>
        }
      />

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
              {h.refreshedAt.slice(0, 19).replace('T', ' ')}
            </p>
          </div>
        </AdminPanel>
      </div>

      {groups.map((g) => (
        <AdminPanel key={g.id}>
          <AdminPanelHeader title={g.title} />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {h.metrics
              .filter((m) => m.group === g.id)
              .map((m) => (
                <article
                  key={m.id}
                  className={cn(
                    'rounded-2xl border p-4 transition-colors',
                    TONE[m.tone],
                  )}
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
    </div>
  )
}
