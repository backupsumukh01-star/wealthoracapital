'use client'

import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdminOs } from '@/providers/admin-os-provider'
import { useState } from 'react'

export function AdminSiteSettingsWorkspace() {
  const { state, updateSiteSeo } = useAdminOs()
  const s = state.siteSeo
  const [confirmMaint, setConfirmMaint] = useState(false)

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Site Settings"
        description="Website name, logo, favicon, SEO meta, analytics pixels, maintenance, and support hours."
      />

      <AdminPanel>
        <AdminPanelHeader title="Brand & SEO" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          {(
            [
              ['websiteName', 'Website name'],
              ['logoUrl', 'Logo URL'],
              ['faviconUrl', 'Favicon URL'],
              ['metaTitle', 'Meta title'],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <Input value={s[key]} onChange={(e) => updateSiteSeo({ [key]: e.target.value })} />
            </FormField>
          ))}
          <FormField label="Meta description" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={s.metaDescription}
              onChange={(e) => updateSiteSeo({ metaDescription: e.target.value })}
            />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Analytics & pixels" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Google Analytics ID">
            <Input
              value={s.googleAnalyticsId}
              onChange={(e) => updateSiteSeo({ googleAnalyticsId: e.target.value })}
              placeholder="G-XXXXXXXX"
            />
          </FormField>
          <FormField label="Facebook Pixel ID">
            <Input
              value={s.facebookPixelId}
              onChange={(e) => updateSiteSeo({ facebookPixelId: e.target.value })}
              placeholder="Pixel ID"
            />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Support & maintenance" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Support email">
            <Input
              value={s.supportEmail}
              onChange={(e) => updateSiteSeo({ supportEmail: e.target.value })}
            />
          </FormField>
          <FormField label="Support phone">
            <Input
              value={s.supportPhone}
              onChange={(e) => updateSiteSeo({ supportPhone: e.target.value })}
            />
          </FormField>
          <FormField label="Support hours" className="sm:col-span-2">
            <Input
              value={s.supportHours}
              onChange={(e) => updateSiteSeo({ supportHours: e.target.value })}
            />
          </FormField>
          <FormField label="Maintenance message" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={s.maintenanceMessage}
              onChange={(e) => updateSiteSeo({ maintenanceMessage: e.target.value })}
            />
          </FormField>
          <label className="flex items-center gap-2 text-caption text-fg-muted sm:col-span-2">
            <input
              type="checkbox"
              checked={s.maintenanceMode}
              onChange={(e) => {
                if (e.target.checked) setConfirmMaint(true)
                else {
                  updateSiteSeo({ maintenanceMode: false })
                  toast.success('Maintenance mode off')
                }
              }}
            />
            Maintenance mode
          </label>
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <Button type="button" onClick={() => toast.success('Site settings saved')}>
            Save settings
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Revision history"
          description="Recent CMS saves — last 80 entries."
        />
        <ul className="max-h-64 divide-y divide-white/[0.04] overflow-y-auto">
          {state.revisions.length === 0 ? (
            <li className="px-4 py-6 text-center text-caption text-fg-subtle sm:px-5">
              No revisions yet. Publish landing or update site settings to start history.
            </li>
          ) : (
            state.revisions.slice(0, 20).map((r) => (
              <li key={r.id} className="px-4 py-3 sm:px-5">
                <p className="text-body-sm text-fg">
                  {r.module} · {r.label}
                </p>
                <p className="text-caption text-fg-subtle">
                  {r.admin} · {new Date(r.at).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
      </AdminPanel>

      <ConfirmActionDialog
        open={confirmMaint}
        onOpenChange={setConfirmMaint}
        title="Enable maintenance mode?"
        description="Public surfaces will show the maintenance message. Registration and funding may pause."
        confirmLabel="Enable"
        danger
        onConfirm={() => {
          updateSiteSeo({ maintenanceMode: true })
          toast.success('Maintenance mode enabled')
        }}
      />
    </div>
  )
}

export function AdminBackupWorkspace() {
  const { exportBackup, recordBackupPoint, state } = useAdminOs()
  const [scope, setScope] = useState<'settings' | 'content' | 'reports' | 'full'>('full')
  const bc = state.backupCenter

  function downloadCsv(name: string, rows: string[][]) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Backup Center"
        description="Restore points, scheduled backups, JSON exports, and CSV helpers. Restore applies when the backend worker is online."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">Last backup</p>
            <p className="mt-1 text-body-sm tabular-nums text-fg">
              {bc.lastBackupAt.slice(0, 19).replace('T', ' ')}
            </p>
          </div>
        </AdminPanel>
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">Next scheduled</p>
            <p className="mt-1 text-body-sm tabular-nums text-fg">
              {bc.nextBackupAt.slice(0, 19).replace('T', ' ')}
            </p>
          </div>
        </AdminPanel>
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">Last size</p>
            <p className="mt-1 text-body-sm text-fg">{bc.lastSizeLabel}</p>
          </div>
        </AdminPanel>
        <AdminPanel>
          <div className="p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">Schedule</p>
            <p className="mt-1 text-body-sm text-fg">{bc.autoSchedule}</p>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Restore points" description={`${bc.points.length} snapshots`} />
        <ul className="divide-y divide-white/[0.04]">
          {bc.points.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
            >
              <div>
                <p className="font-medium text-fg">{p.label}</p>
                <p className="text-caption text-fg-subtle">
                  {p.at.slice(0, 19).replace('T', ' ')} · {p.sizeLabel} · {p.scope}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => toast.message('Download queued', { description: p.label })}
                >
                  Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    toast.message('Restore requires backend confirmation', {
                      description: p.label,
                    })
                  }
                >
                  Restore
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Create backup (JSON)" />
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          {(['settings', 'content', 'reports', 'full'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              variant={scope === s ? 'primary' : 'glass'}
              size="sm"
              onClick={() => setScope(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <Button
            type="button"
            onClick={() => {
              const json = exportBackup(scope)
              const kb = Math.max(1, Math.round(json.length / 1024))
              recordBackupPoint(scope, `${kb} KB`)
              toast.success(`Exported ${scope} backup (JSON)`)
            }}
          >
            Download JSON & record point
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="CSV / Excel-ready exports" />
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          <Button
            type="button"
            variant="glass"
            onClick={() => {
              downloadCsv('wealthora-faqs.csv', [
                ['id', 'question', 'answer'],
                ...state.faqs.map((f) => [f.id, f.question, f.answer]),
              ])
              toast.success('FAQs CSV downloaded')
            }}
          >
            FAQs CSV
          </Button>
          <Button
            type="button"
            variant="glass"
            onClick={() => {
              downloadCsv('wealthora-reports.csv', [
                ['id', 'title', 'type', 'status', 'period'],
                ...state.reportDocs.map((r) => [r.id, r.title, r.type, r.status, r.periodLabel]),
              ])
              toast.success('Reports CSV downloaded')
            }}
          >
            Reports CSV
          </Button>
          <Button
            type="button"
            variant="glass"
            onClick={() => {
              downloadCsv('wealthora-testimonials.csv', [
                ['id', 'name', 'country', 'rating', 'enabled'],
                ...state.testimonials.map((t) => [
                  t.id,
                  t.name,
                  t.country,
                  String(t.rating),
                  String(t.enabled),
                ]),
              ])
              toast.success('Testimonials CSV downloaded')
            }}
          >
            Testimonials CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => toast.message('Excel (.xlsx) ships with the backend export worker')}
          >
            Excel (API-ready)
          </Button>
        </div>
      </AdminPanel>
    </div>
  )
}
