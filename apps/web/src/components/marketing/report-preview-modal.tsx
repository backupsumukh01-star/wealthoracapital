'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

export type ReportPreviewItem = {
  id: string
  title: string
  /** HTML (or PDF) URL shown inside the in-app viewer */
  previewUrl: string
  /** Original file download URL (PDF/CSV) — never used for preview */
  downloadUrl: string
  fileName?: string
}

type ReportPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ReportPreviewItem[]
  initialId?: string | null
}

/**
 * Full-screen in-app report viewer. Preview stays on-site; download is separate.
 */
export function ReportPreviewModal({
  open,
  onOpenChange,
  items,
  initialId,
}: ReportPreviewModalProps) {
  const initialIndex = useMemo(() => {
    if (!initialId) return 0
    const i = items.findIndex((x) => x.id === initialId)
    return i >= 0 ? i : 0
  }, [items, initialId])

  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    if (open) {
      setIndex(initialIndex)
      setZoom(1)
      setPage(1)
    }
  }, [open, initialIndex])

  const current = items[index] ?? null

  const goPrevReport = () => setIndex((i) => Math.max(0, i - 1))
  const goNextReport = () => setIndex((i) => Math.min(items.length - 1, i + 1))

  const onIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const doc = e.currentTarget.contentDocument
        if (!doc) return
        const pages = doc.querySelectorAll('.report-page')
        setPageCount(Math.max(1, pages.length || 1))
        setPage(1)
        // Soft-scroll helper for page jumps
        ;(e.currentTarget.contentWindow as Window & { __growzyGoPage?: (n: number) => void }).__growzyGoPage =
          (n: number) => {
            const el = doc.querySelectorAll('.report-page')[n - 1] as HTMLElement | undefined
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
      } catch {
        setPageCount(1)
      }
    },
    [],
  )

  const goPage = (n: number) => {
    const next = Math.min(pageCount, Math.max(1, n))
    setPage(next)
    const iframe = document.getElementById('growzy-report-frame') as HTMLIFrameElement | null
    try {
      const win = iframe?.contentWindow as (Window & { __growzyGoPage?: (n: number) => void }) | null
      win?.__growzyGoPage?.(next)
    } catch {
      /* cross-origin fallback — ignore */
    }
  }

  const printReport = () => {
    const iframe = document.getElementById('growzy-report-frame') as HTMLIFrameElement | null
    try {
      iframe?.contentWindow?.focus()
      iframe?.contentWindow?.print()
    } catch {
      if (current?.previewUrl) window.open(current.previewUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          'fixed inset-0 left-0 top-0 z-[80] flex h-[100dvh] max-h-none w-screen max-w-none',
          'translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0',
          'bg-[#07131C] p-0 pt-0 pb-0 shadow-none',
        )}
      >
        <DialogTitle className="sr-only">{current?.title ?? 'Report preview'}</DialogTitle>
        <DialogDescription className="sr-only">
          In-app report preview. Use zoom, page controls, download, or close to return.
        </DialogDescription>

        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#0B1A24] px-3 py-2.5 sm:px-4">
          <Button
            type="button"
            size="sm"
            variant="glass"
            onClick={() => onOpenChange(false)}
            aria-label="Close preview"
          >
            <X aria-hidden />
            <span className="hidden sm:inline">Close</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="glass"
            onClick={() => onOpenChange(false)}
            className="sm:hidden"
            aria-label="Back"
          >
            <ChevronLeft aria-hidden />
            Back
          </Button>

          <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg">
            {current?.title ?? 'Report'}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={index <= 0}
              onClick={goPrevReport}
              aria-label="Previous report"
            >
              <ChevronLeft aria-hidden />
            </Button>
            <span className="hidden text-caption tabular-nums text-fg-subtle sm:inline">
              {items.length ? `${index + 1} / ${items.length}` : '0 / 0'}
            </span>
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={index >= items.length - 1}
              onClick={goNextReport}
              aria-label="Next report"
            >
              <ChevronRight aria-hidden />
            </Button>

            <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              aria-label="Previous page"
            >
              Prev page
            </Button>
            <span className="text-caption tabular-nums text-fg-subtle">
              {page}/{pageCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={page >= pageCount}
              onClick={() => goPage(page + 1)}
              aria-label="Next page"
            >
              Next page
            </Button>

            <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

            <Button
              type="button"
              size="sm"
              variant="glass"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out"
            >
              <ZoomOut aria-hidden />
            </Button>
            <span className="w-10 text-center text-caption tabular-nums text-fg-subtle">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="sm"
              variant="glass"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in"
            >
              <ZoomIn aria-hidden />
            </Button>

            {current?.downloadUrl ? (
              <Button asChild size="sm" variant="secondary">
                <a href={current.downloadUrl} download={current.fileName} rel="noreferrer">
                  <Download aria-hidden />
                  Download
                </a>
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant="glass"
              onClick={printReport}
              className="hidden md:inline-flex"
              aria-label="Print"
            >
              <Printer aria-hidden />
              Print
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-auto bg-[#050D14]">
          <div
            className="mx-auto origin-top px-2 py-3 sm:px-4 sm:py-6"
            style={{
              width: `${100 / zoom}%`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            {current ? (
              <iframe
                id="growzy-report-frame"
                key={current.id}
                title={current.title}
                src={current.previewUrl}
                className="mx-auto h-[min(90vh,1200px)] w-full max-w-5xl rounded-xl border border-white/10 bg-[#07131C] shadow-e3"
                onLoad={onIframeLoad}
              />
            ) : (
              <p className="p-8 text-center text-body-sm text-fg-muted">No report selected.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
