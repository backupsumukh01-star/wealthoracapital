'use client'

import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ADMIN_AUDIT } from '@/lib/admin-demo-data'
import { formatDateTime } from '@/lib/format'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminAuditWorkspace() {
  const { state } = useAdminOs()
  const live = state.audit
  const legacy = ADMIN_AUDIT
  const [q, setQ] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return live.filter((row) => {
      if (adminFilter && !row.admin.toLowerCase().includes(adminFilter.toLowerCase())) return false
      if (actionFilter && !row.action.toLowerCase().includes(actionFilter.toLowerCase())) return false
      if (!needle) return true
      const hay = `${row.admin} ${row.action} ${row.user} ${row.oldValue} ${row.newValue} ${row.reason ?? ''} ${row.ip}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [live, q, adminFilter, actionFilter])

  function exportCsv() {
    const header = [
      'date',
      'time',
      'admin',
      'ip',
      'browser',
      'action',
      'affected_user',
      'old_value',
      'new_value',
      'reason',
    ]
    const rows = filtered.map((r) => {
      const d = new Date(r.at)
      return [
        d.toISOString().slice(0, 10),
        d.toISOString().slice(11, 19),
        r.admin,
        r.ip,
        r.browser,
        r.action,
        r.user,
        r.oldValue,
        r.newValue,
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
    a.download = `growzy-audit-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit CSV exported')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Audit Center"
        description="Every admin action with date, time, IP, browser, old/new values, and reason. Searchable, filterable, exportable."
        actions={
          <Button type="button" variant="glass" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader
          title="Live OS audit"
          description={`${filtered.length} of ${live.length} events`}
        />
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:px-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="pl-9"
              placeholder="Search action, user, values, reason…"
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
          <table className="w-full min-w-[1100px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Date / time</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Browser</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Old</th>
                <th className="px-4 py-3 font-medium">New</th>
                <th className="px-4 py-3 font-medium sm:px-5">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 tabular-nums text-fg-muted sm:px-5">
                    {formatDateTime(row.at)}
                  </td>
                  <td className="px-4 py-3 text-fg">{row.admin}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{row.ip}</td>
                  <td className="px-4 py-3 text-fg-muted">{row.browser}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg">{row.action}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{row.user}</td>
                  <td className="px-4 py-3 text-fg-subtle">{row.oldValue}</td>
                  <td className="px-4 py-3 text-fg-muted">{row.newValue}</td>
                  <td className="px-4 py-3 text-fg-subtle sm:px-5">{row.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Seed history" description="Static demo events retained for continuity." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium sm:px-5">Detail</th>
              </tr>
            </thead>
            <tbody>
              {legacy.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 tabular-nums text-fg-muted sm:px-5">
                    {formatDateTime(row.at)}
                  </td>
                  <td className="px-4 py-3 text-fg">{row.actor}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg">{row.action}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{row.target}</td>
                  <td className="px-4 py-3 text-fg-muted sm:px-5">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
