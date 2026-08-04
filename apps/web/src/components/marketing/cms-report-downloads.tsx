'use client'

import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAdminOs } from '@/providers/admin-os-provider'

/** Investor-facing published report downloads from CMS report library. */
export function CmsReportDownloads() {
  const { ready, state } = useAdminOs()
  const docs = ready
    ? state.reportDocs.filter((d) => d.status === 'PUBLISHED')
    : []

  if (!docs.length) {
    return (
      <p className="text-caption text-fg-subtle">
        No published reports yet. Check back after the next statement cycle.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-raised/40">
      {docs.map((doc) => {
        const Icon =
          doc.type === 'EXCEL' || doc.type === 'CSV' ? FileSpreadsheet : FileText
        return (
          <li
            key={doc.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-inset/50 text-accent-300">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-fg">{doc.title}</p>
                <p className="text-caption text-fg-subtle">
                  {doc.type.replace(/_/g, ' ')} · {doc.periodLabel} · {doc.fileName}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="glass"
              onClick={() => {
                if (doc.url && doc.url !== '#') {
                  window.open(doc.url, '_blank', 'noopener,noreferrer')
                } else {
                  toast.message('Demo file — connect storage URL in Report Library to enable real downloads')
                }
              }}
            >
              <Download aria-hidden />
              Download
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
