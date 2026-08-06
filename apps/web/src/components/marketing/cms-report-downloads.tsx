'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHitCmsDownload, usePublishedDownloads } from '@/features/cms/frontend-hooks'
import { formatBytes } from '@/lib/format'

/**
 * Investor-facing published CMS downloads (public API).
 */
export function CmsReportDownloads() {
  const { data: items, isLoading, isError } = usePublishedDownloads()
  const hit = useHitCmsDownload()

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-caption text-fg-subtle">
        Downloads are temporarily unavailable. Please try again later.
      </p>
    )
  }

  if (!items?.length) {
    return (
      <p className="text-caption text-fg-subtle">
        No published reports yet. Check back after the next statement cycle.
      </p>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div>
            <p className="text-caption uppercase tracking-wider text-fg-subtle">{doc.category}</p>
            <h3 className="mt-1 text-body-sm font-medium text-fg">{doc.title}</h3>
            {doc.description ? (
              <p className="mt-1 line-clamp-2 text-caption text-fg-muted">{doc.description}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-fg-subtle">
              {doc.fileName} · {doc.sizeLabel ?? formatBytes(doc.sizeBytes)} · v{doc.version}
            </p>
          </div>
          <div className="mt-3">
            <Button asChild size="sm" variant="glass">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                download={doc.fileName}
                onClick={() => {
                  void hit.mutateAsync(doc.id).catch(() => undefined)
                }}
              >
                <Download aria-hidden />
                {doc.buttonLabel || 'Download'}
              </a>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
