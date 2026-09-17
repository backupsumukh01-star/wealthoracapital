'use client'

import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminAudit } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

export function AdminAuditWorkspace() {
  const { data, isLoading } = useAdminAudit()
  const live = data?.items ?? []
  const [q, setQ] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return live.filter((row) => {
      const actor = row.actorName ?? ''
      const action = row.action ?? ''
      const target = `${row.targetType ?? ''} ${row.targetId ?? ''}`
      if (adminFilter && !actor.toLowerCase().includes(adminFilter.toLowerCase())) return false
      if (actionFilter && !action.toLowerCase().includes(actionFilter.toLowerCase())) return false
      if (!needle) return true
      const hay =
        `${actor} ${action} ${target} ${row.reason ?? ''} ${row.ip ?? ''} ${row.actorRole ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [live, q, adminFilter, actionFilter])

  function exportCsv() {
    const header = ['date', 'time', 'admin', 'role', 'ip', 'action', 'target', 'reason']
    const rows = filtered.map((r) => {
      const d = new Date(r.createdAt)
      return [
        d.toISOString().slice(0, 10),
        d.toISOString().slice(11, 19),
        r.actorName ?? '',
        r.actorRole ?? '',
        r.ip ?? '',
        r.action,
        `${r.targetType ?? ''}:${r.targetId ?? ''}`,
        r.reason ?? '',
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wealthora-audit-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit CSV exported')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Audit Center"
        description="Every admin action from the production audit API. Searchable, filterable, exportable."
        actions={
          <Button type="button" variant="glass" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader
          title="Audit log"
          description={
            isLoading ? 'Loading…' : `${filtered.length} of ${live.length} events`
          }
        />
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:px-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="pl-9"
              placeholder="Search action, user, reason…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Input
            className="sm:max-w-[180px]"
            placeholder="Filter admin"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
          />
          <Input
            className="sm:max-w-[180px]"
            placeholder="Filter action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Date / time</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium sm:px-5">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-fg-muted">
                    {isLoading ? 'Loading audit events…' : 'No audit events from API.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 tabular-nums text-fg-muted sm:px-5">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-fg">
                      {row.actorName ?? '—'}
                      {row.actorRole ? (
                        <span className="ml-1 text-fg-subtle">({row.actorRole})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">
                      {row.ip ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg">{row.action}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">
                      {row.targetType ?? '—'}
                      {row.targetId ? ` · ${row.targetId}` : ''}
                    </td>
                    <td className="px-4 py-3 text-fg-subtle sm:px-5">{row.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
