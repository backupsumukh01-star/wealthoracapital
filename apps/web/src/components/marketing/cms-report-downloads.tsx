'use client'

import { useMemo } from 'react'
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHitCmsDownload, usePublishedDownloads } from '@/features/cms/frontend-hooks'
import {
  DOWNLOAD_PERIODS,
  normalizeDownloadPeriod,
  type DownloadPeriod,
} from '@/features/landing'
import { formatBytes } from '@/lib/format'
import type { CmsDownload } from '@/services/cms-download.service'

/**
 * Investor-facing published CMS downloads (public API), grouped by report period.
 * New Admin uploads appear automatically once published.
 */
export function CmsReportDownloads() {
  const { data: items, isLoading, isError } = usePublishedDownloads()
  const hit = useHitCmsDownload()

  const grouped = useMemo(() => {
    const map = new Map<DownloadPeriod | 'Other', CmsDownload[]>()
    for (const period of DOWNLOAD_PERIODS) map.set(period, [])
    map.set('Other', [])
    for (const doc of items ?? []) {
      const key = normalizeDownloadPeriod(doc.category)
      map.get(key)!.push(doc)
    }
    return map
  }, [items])

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

  const hasAny = (items?.length ?? 0) > 0

  return (
    <div className="space-y-8">
      {DOWNLOAD_PERIODS.map((period) => {
        const docs = grouped.get(period) ?? []
        return (
          <section key={period}>
            <h3 className="text-body-sm font-medium text-fg">{period}</h3>
            {docs.length === 0 ? (
              <p className="mt-2 text-caption text-fg-subtle">
                No {period.toLowerCase()} published yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="text-caption uppercase tracking-wider text-fg-subtle">
                        {doc.category}
                      </p>
                      <h4 className="mt-1 text-body-sm font-medium text-fg">{doc.title}</h4>
                      {doc.description ? (
                        <p className="mt-1 line-clamp-2 text-caption text-fg-muted">
                          {doc.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-fg-subtle">
                        {doc.fileName} · {doc.sizeLabel ?? formatBytes(doc.sizeBytes)} · v
                        {doc.version}
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
            )}
          </section>
        )
      })}

      {(grouped.get('Other')?.length ?? 0) > 0 ? (
        <section>
          <h3 className="text-body-sm font-medium text-fg">Other reports</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {grouped.get('Other')!.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div>
                  <p className="text-caption uppercase tracking-wider text-fg-subtle">
                    {doc.category}
                  </p>
                  <h4 className="mt-1 text-body-sm font-medium text-fg">{doc.title}</h4>
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
        </section>
      ) : null}

      {!hasAny ? (
        <p className="text-caption text-fg-subtle">
          No published reports yet. Check back after the next statement cycle.
        </p>
      ) : null}
    </div>
  )
}
