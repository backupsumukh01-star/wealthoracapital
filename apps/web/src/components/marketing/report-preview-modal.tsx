'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
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

export type ReportPreviewItem = {
  id: string
  title: string
  /** HTML (preferred) or PDF URL shown inside the in-app viewer */
  previewUrl: string
  /** Original file download URL (PDF/CSV) — never used for preview navigation */
  downloadUrl: string
  fileName?: string
}

type ReportPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ReportPreviewItem[]
  initialId?: string | null
}

function isPdfUrl(url: string) {
  return /\.pdf($|\?)/i.test(url)
}

function toHtmlPreviewUrl(url: string) {
  if (/\.html($|\?)/i.test(url)) return url
  if (/\.pdf($|\?)/i.test(url)) return url.replace(/\.pdf($|\?)/i, '.html$1')
  return url
}

/**
 * Full-screen in-app report viewer.
 * Prefers branded HTML (srcDoc) so preview never leaves the site; PDF embeds as fallback.
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
  const [htmlDoc, setHtmlDoc] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const objectRef = useRef<HTMLObjectElement | null>(null)

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

  useEffect(() => {
    if (!open || !current) return
    let cancelled = false
    setLoadError(null)
    setLoading(true)
    setHtmlDoc(null)
    setPdfUrl(null)
    setPage(1)
    setPageCount(1)

    const load = async () => {
      const htmlUrl = toHtmlPreviewUrl(current.previewUrl)
      try {
        const res = await fetch(htmlUrl, { cache: 'force-cache' })
        if (res.ok) {
          const text = await res.text()
          if (!cancelled && (text.includes('<html') || text.includes('report-page'))) {
            setHtmlDoc(text)
            const pages = (text.match(/class="report-page"/g) ?? []).length
            setPageCount(Math.max(1, pages || 1))
            setLoading(false)
            return
          }
        }
      } catch {
        /* try PDF embed */
      }

      const fallbackPdf = isPdfUrl(current.previewUrl)
        ? current.previewUrl
        : isPdfUrl(current.downloadUrl)
          ? current.downloadUrl
          : null

      if (!cancelled) {
        if (fallbackPdf) {
          setPdfUrl(fallbackPdf)
          setPageCount(1)
          setLoading(false)
        } else {
          setLoadError('Report preview could not be loaded.')
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, current])

  const goPage = useCallback(
    (n: number) => {
      const next = Math.min(pageCount, Math.max(1, n))
      setPage(next)
      const doc = iframeRef.current?.contentDocument
      if (!doc) return
      const el = doc.querySelectorAll('.report-page')[next - 1] as HTMLElement | undefined
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [pageCount],
  )

  const onIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const pages = doc.querySelectorAll('.report-page')
    if (pages.length) {
      setPageCount(pages.length)
      setPage(1)
    }
  }

  const printReport = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
        return
      }
      // PDF object — trigger print on the embedded viewer when available
      const win = objectRef.current?.contentDocument?.defaultView
      win?.print()
    } catch {
      /* ignore */
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col bg-[#07090B] outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {current?.title ?? 'Report preview'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            In-app report preview with page controls, zoom and download. Close to return.
          </DialogPrimitive.Description>

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

            <div className="flex max-w-full flex-wrap items-center gap-1.5">
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
                disabled={page <= 1 || Boolean(pdfUrl)}
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
                disabled={page >= pageCount || Boolean(pdfUrl)}
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
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
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
            {loading ? (
              <p className="p-8 text-center text-body-sm text-fg-muted">Loading report…</p>
            ) : loadError ? (
              <div className="space-y-3 p-8 text-center">
                <p className="text-body-sm text-fg-muted">{loadError}</p>
                {current?.downloadUrl ? (
                  <Button asChild size="sm" variant="secondary">
                    <a href={current.downloadUrl} download={current.fileName}>
                      <Download aria-hidden />
                      Download instead
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : htmlDoc ? (
              <div
                className="mx-auto origin-top px-2 py-3 sm:px-4 sm:py-6"
                style={{
                  width: `${100 / zoom}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  ref={iframeRef}
                  title={current?.title ?? 'Report'}
                  srcDoc={htmlDoc}
                  onLoad={onIframeLoad}
                  className="mx-auto block h-[min(88dvh,1100px)] w-full max-w-5xl rounded-xl border border-white/10 bg-[#07090B] shadow-e3"
                  // allow-same-origin needed for page navigation + print; no allow-top-navigation
                  sandbox="allow-same-origin allow-modals"
                />
              </div>
            ) : pdfUrl ? (
              <div
                className="mx-auto h-full min-h-[70dvh] w-full max-w-5xl origin-top px-2 py-3 sm:px-4 sm:py-6"
                style={{
                  width: `${100 / zoom}%`,
                  maxWidth: '64rem',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <object
                  ref={objectRef}
                  data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  type="application/pdf"
                  className="h-[min(88dvh,1100px)] w-full rounded-xl border border-white/10 bg-[#07090B]"
                  aria-label={current?.title ?? 'PDF report'}
                >
                  <p className="p-6 text-center text-body-sm text-fg-muted">
                    Inline PDF preview is unavailable in this browser.{' '}
                    <a className="text-accent-400 underline" href={pdfUrl} download={current?.fileName}>
                      Download the PDF
                    </a>
                    .
                  </p>
                </object>
              </div>
            ) : (
              <p className="p-8 text-center text-body-sm text-fg-muted">No report selected.</p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
