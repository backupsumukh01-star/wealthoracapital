'use client'

import { useMemo, useState } from 'react'
import { Download, FileUp, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { adminOsId, adminOsNow } from '@/lib/admin-os-store'
import type { CmsReportDoc, ReportDocType } from '@/lib/admin-cms-extras'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

const TYPES: Array<ReportDocType | 'ALL'> = [
  'ALL',
  'MONTHLY_PDF',
  'WEEKLY_PDF',
  'DAILY',
  'PERFORMANCE_PDF',
  'EXCEL',
  'CSV',
]

export function AdminReportLibraryWorkspace() {
  const { state, upsertReportDoc, publishReportDoc, removeReportDoc } = useAdminOs()
  const [q, setQ] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('ALL')
  const [page, setPage] = useState(1)
  const [publishId, setPublishId] = useState<string | null>(null)
  const pageSize = 6

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.reportDocs.filter((r) => {
      if (type !== 'ALL' && r.type !== type) return false
      if (!needle) return true
      return (
        r.title.toLowerCase().includes(needle) ||
        r.fileName.toLowerCase().includes(needle) ||
        r.periodLabel.toLowerCase().includes(needle)
      )
    })
  }, [state.reportDocs, q, type])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function onFile(file: File, docType: ReportDocType) {
    const reader = new FileReader()
    reader.onload = () => {
      const doc: CmsReportDoc = {
        id: adminOsId('REP'),
        title: file.name.replace(/\.[^.]+$/, ''),
        type: docType,
        periodLabel: new Date().toISOString().slice(0, 7),
        fileName: file.name,
        url: String(reader.result),
        status: 'DRAFT',
        publishedAt: null,
        createdAt: adminOsNow(),
        downloads: 0,
      }
      upsertReportDoc(doc)
      toast.success('Report uploaded as draft')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Report Library"
        description="Upload monthly, weekly, daily, performance PDFs plus Excel/CSV. Published files download instantly for investors."
        actions={
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['MONTHLY_PDF', 'Monthly PDF'],
                ['WEEKLY_PDF', 'Weekly PDF'],
                ['DAILY', 'Daily'],
                ['PERFORMANCE_PDF', 'Performance'],
                ['EXCEL', 'Excel'],
                ['CSV', 'CSV'],
              ] as const
            ).map(([t, label]) => (
              <label key={t} className="inline-flex cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  accept={
                    t === 'CSV'
                      ? '.csv,text/csv'
                      : t === 'EXCEL'
                        ? '.xlsx,.xls'
                        : 'application/pdf,.pdf'
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onFile(f, t)
                    e.target.value = ''
                  }}
                />
                <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-caption text-fg-muted hover:text-fg">
                  <FileUp className="size-3.5" aria-hidden />
                  {label}
                </span>
              </label>
            ))}
          </div>
        }
      />

      <AdminPanel>
        <AdminPanelHeader title="Documents" />
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:px-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="pl-9"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search reports…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  setPage(1)
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  type === t
                    ? 'border-accent-500/40 bg-accent-500/15 text-accent-200'
                    : 'border-white/10 text-fg-muted',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 sm:px-5">
                    <FormField label="">
                      <Input
                        value={r.title}
                        onChange={(e) => upsertReportDoc({ ...r, title: e.target.value })}
                      />
                    </FormField>
                    <p className="mt-1 font-mono text-[11px] text-fg-subtle">{r.fileName}</p>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{r.type}</td>
                  <td className="px-4 py-3">
                    <Input
                      className="max-w-[7rem]"
                      value={r.periodLabel}
                      onChange={(e) => upsertReportDoc({ ...r, periodLabel: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{r.status}</td>
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap gap-1">
                      {r.status !== 'PUBLISHED' ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setPublishId(r.id)}
                        >
                          Publish
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="glass">
                          <a href={r.url || '#'} download={r.fileName}>
                            <Download className="size-3.5" aria-hidden />
                            Download
                          </a>
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          removeReportDoc(r.id)
                          toast.message('Report removed')
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between border-t border-white/[0.06] px-4 py-3 sm:px-5">
          <p className="text-caption text-fg-subtle">
            Page {page} / {pages}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="glass" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button
              size="sm"
              variant="glass"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminPanel>

      <ConfirmActionDialog
        open={Boolean(publishId)}
        onOpenChange={(o) => !o && setPublishId(null)}
        title="Publish report?"
        description="Investors will be able to download this document from the reports surface."
        confirmLabel="Publish"
        onConfirm={() => {
          if (publishId) {
            publishReportDoc(publishId)
            toast.success('Report published')
          }
        }}
      />
    </div>
  )
}
