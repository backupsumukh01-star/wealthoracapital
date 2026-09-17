'use client'

import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type Announcement } from '@/lib/admin-os-store'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminActivityWorkspace() {
  const { state, updateActivity } = useAdminOs()
  const a = state.activity

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Live Activity Manager"
        description="Control deposit, withdrawal, investment, and profit social-proof chips. Landing updates automatically."
      />

      <AdminPanel>
        <AdminPanelHeader title="Configuration" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <label className="flex items-center gap-2 text-caption text-fg-muted sm:col-span-2">
            <input
              type="checkbox"
              checked={a.enabled}
              onChange={(e) => updateActivity({ enabled: e.target.checked })}
            />
            Enable live activity on landing
          </label>
          <FormField label="Random names (comma-separated)">
            <Textarea
              value={a.names.join(', ')}
              onChange={(e) =>
                updateActivity({
                  names: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={2}
            />
          </FormField>
          <FormField label="Countries (codes)">
            <Input
              value={a.countries.join(', ')}
              onChange={(e) =>
                updateActivity({
                  countries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </FormField>
          <FormField label="Deposit min">
            <Input
              type="number"
              value={a.depositMin}
              onChange={(e) => updateActivity({ depositMin: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Deposit max">
            <Input
              type="number"
              value={a.depositMax}
              onChange={(e) => updateActivity({ depositMax: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Withdrawal min">
            <Input
              type="number"
              value={a.withdrawalMin}
              onChange={(e) => updateActivity({ withdrawalMin: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Withdrawal max">
            <Input
              type="number"
              value={a.withdrawalMax}
              onChange={(e) => updateActivity({ withdrawalMax: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Delay / rotation (ms)">
            <Input
              type="number"
              value={a.delayMs}
              onChange={(e) => updateActivity({ delayMs: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Animation duration factor">
            <Input
              type="number"
              step="0.1"
              value={a.animationSpeed}
              onChange={(e) => updateActivity({ animationSpeed: Number(e.target.value) })}
            />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Current seed feed" description="Deposit · withdrawal · investment · profit rotation" />
        <ul className="divide-y divide-white/[0.04]">
          {a.seedItems.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="text-fg">
                {item.name} · {item.region}
              </span>
              <span className="tabular-nums text-fg-muted">
                {item.type} · ${item.amount}
              </span>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  )
}

export function AdminAnnouncementsWorkspace() {
  const { state, upsertAnnouncement, removeAnnouncement } = useAdminOs()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | Announcement['status']>('ALL')
  const [page, setPage] = useState(0)
  const pageSize = 8

  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'NEWS' as Announcement['type'],
    color: '#D4D9DF',
    priority: 'NORMAL' as Announcement['priority'],
    expiresAt: '',
    displayPage: 'ALL' as Announcement['displayPage'],
    sticky: true,
    popup: false,
  })

  const filtered = useMemo(() => {
    return state.announcements.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
      if (!q.trim()) return true
      const hay = `${a.title} ${a.body} ${a.type}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
  }, [state.announcements, q, statusFilter])

  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))

  function buildAnnouncement(status: Announcement['status'], scheduledAt: string | null): Announcement {
    return {
      id: `ANN_${Date.now()}`,
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim(),
      status,
      scheduledAt,
      createdAt: new Date().toISOString(),
      publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : null,
      color: form.color,
      priority: form.priority,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      displayPage: form.displayPage,
      sticky: form.sticky,
      popup: form.popup || form.type === 'POPUP',
    }
  }

  function resetForm() {
    setForm((f) => ({
      ...f,
      title: '',
      body: '',
      expiresAt: '',
    }))
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Announcement Center"
        description="Banners and popups with colour, priority, expiry, page targeting, and sticky behaviour."
      />

      <AdminPanel>
        <AdminPanelHeader title="Create announcement" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Type">
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Announcement['type'] }))}
            >
              {[
                'MAINTENANCE',
                'PROMOTION',
                'NEWS',
                'RETURN',
                'POPUP',
                'TOP_BANNER',
                'DASHBOARD_BANNER',
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Priority">
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value as Announcement['priority'] }))
              }
            >
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Title" className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </FormField>
          <FormField label="Body" className="sm:col-span-2">
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
            />
          </FormField>
          <FormField label="Banner colour">
            <Input
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            />
          </FormField>
          <FormField label="Display page">
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
              value={form.displayPage}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  displayPage: e.target.value as Announcement['displayPage'],
                }))
              }
            >
              {['ALL', 'HOME', 'DASHBOARD', 'WALLET'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Expiry">
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </FormField>
          <div className="flex flex-col gap-2 justify-end text-caption text-fg-muted">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.sticky}
                onChange={(e) => setForm((f) => ({ ...f, sticky: e.target.checked }))}
              />
              Sticky banner
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.popup}
                onChange={(e) => setForm((f) => ({ ...f, popup: e.target.checked }))}
              />
              Show as popup
            </label>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="button"
              onClick={() => {
                if (!form.title.trim()) return
                upsertAnnouncement(buildAnnouncement('PUBLISHED', null))
                resetForm()
                toast.success('Announcement published')
              }}
            >
              Publish now
            </Button>
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                if (!form.title.trim()) return
                const scheduledAt = new Date(Date.now() + 3600_000).toISOString()
                upsertAnnouncement(buildAnnouncement('SCHEDULED', scheduledAt))
                resetForm()
                toast.success('Scheduled for +1 hour')
              }}
            >
              Schedule publish
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!form.title.trim()) return
                upsertAnnouncement(buildAnnouncement('DRAFT', null))
                resetForm()
                toast.success('Saved as draft')
              }}
            >
              Save draft
            </Button>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Library" description={`${filtered.length} matching`} />
        <div className="flex flex-wrap gap-3 border-b border-white/[0.04] px-4 py-3 sm:px-5">
          <Input
            placeholder="Search announcements…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(0)
            }}
            className="max-w-xs"
          />
          <select
            className="h-10 rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter)
              setPage(0)
            }}
          >
            {['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {pageItems.map((a) => (
            <li key={a.id} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ background: a.color || '#D4D9DF' }}
                      aria-hidden
                    />
                    <p className="font-medium text-fg">{a.title}</p>
                  </div>
                  <p className="mt-1 text-caption text-fg-muted">{a.body}</p>
                  <p className="mt-1 text-caption text-fg-subtle">
                    {a.type} · {a.status} · {a.priority} · {a.displayPage}
                    {a.sticky ? ' · sticky' : ''}
                    {a.popup ? ' · popup' : ''}
                    {a.expiresAt ? ` · expires ${a.expiresAt.slice(0, 16)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status !== 'PUBLISHED' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        upsertAnnouncement({
                          ...a,
                          status: 'PUBLISHED',
                          publishedAt: new Date().toISOString(),
                        })
                        toast.success('Published')
                      }}
                    >
                      Publish
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="glass"
                      onClick={() => {
                        upsertAnnouncement({ ...a, status: 'ARCHIVED' })
                        toast.message('Archived')
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(a.id)}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <p className="text-caption text-fg-subtle">
            Page {page + 1} / {pages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminPanel>

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete announcement?"
        description="This removes the announcement from the library and live surfaces."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!deleteId) return
          removeAnnouncement(deleteId)
          toast.success('Announcement deleted')
          setDeleteId(null)
        }}
      />
    </div>
  )
}
