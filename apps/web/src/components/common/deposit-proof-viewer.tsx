'use client'

import { Download, FileText, Loader2, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { env } from '@/lib/env'

async function fetchProofBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const absolute = url.startsWith('http') ? url : `${env.NEXT_PUBLIC_API_URL}${url}`
  const response = await fetch(absolute, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: '*/*' },
    signal,
  })
  if (!response.ok) {
    let message = 'Could not load payment proof.'
    try {
      const payload = (await response.json()) as { error?: { message?: string } }
      if (payload?.error?.message) message = payload.error.message
    } catch {
      // binary error body
    }
    throw new Error(message)
  }
  return response.blob()
}

function ProofLightbox({
  open,
  onClose,
  blobUrl,
  isImage,
  isPdf,
  fileName,
}: {
  open: boolean
  onClose: () => void
  blobUrl: string
  isImage: boolean
  isPdf: boolean
  fileName: string
}) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.25))
      if (e.key === '-') setZoom((z) => Math.max(0.5, z - 0.25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) setZoom(1)
  }, [open, blobUrl])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Payment proof preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <p className="truncate text-body-sm font-medium text-white">Payment proof</p>
        <div className="flex flex-wrap items-center gap-2">
          {isImage ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              >
                <ZoomOut className="size-4" aria-hidden />
                Zoom out
              </Button>
              <span className="text-caption text-white/70">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              >
                <ZoomIn className="size-4" aria-hidden />
                Zoom in
              </Button>
            </>
          ) : null}
          <Button type="button" size="sm" variant="secondary" asChild>
            <a href={blobUrl} download={fileName}>
              <Download className="size-4" aria-hidden />
              Download
            </a>
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-white" onClick={onClose}>
            <X className="size-4" aria-hidden />
            Close
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blobUrl}
            alt="Payment proof"
            className="max-h-none origin-center transition-transform"
            style={{ transform: `scale(${zoom})` }}
          />
        ) : isPdf ? (
          <iframe title="Payment proof" src={blobUrl} className="h-full min-h-[70vh] w-full max-w-5xl bg-white" />
        ) : (
          <p className="text-body-sm text-white/80">Preview not available for this file type.</p>
        )}
      </div>
    </div>
  )
}

/**
 * Loads deposit proof via authenticated session cookies (blob URL).
 * Prefer admin `/admin/deposits/:id/proof` or investor `/deposits/:id/proof-file`.
 */
export function DepositProofViewer({
  proofUrl,
  hasProof,
  className,
  compact,
}: {
  proofUrl?: string | null
  hasProof?: boolean
  className?: string
  compact?: boolean
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [mime, setMime] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!proofUrl) {
      setBlobUrl(null)
      setError(null)
      setLoading(false)
      setNatural(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 45_000)

    setLoading(true)
    setError(null)
    setBlobUrl(null)
    setNatural(null)

    void fetchProofBlob(proofUrl, controller.signal)
      .then((blob) => {
        if (cancelled) return
        if (!blob || blob.size === 0) {
          setError('Empty proof response from API.')
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setMime(blob.type || null)
        setBlobUrl(objectUrl)
      })
      .catch((err: Error) => {
        if (cancelled || err.name === 'AbortError') return
        setError(err.message || 'Proof unavailable')
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [proofUrl])

  const isImage = Boolean(mime?.startsWith('image/') || (blobUrl && !mime?.includes('pdf')))
  const isPdf = Boolean(mime === 'application/pdf')
  const openLightbox = useCallback(() => {
    if (blobUrl) setLightbox(true)
  }, [blobUrl])

  if (!proofUrl) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center',
          compact ? 'min-h-[140px]' : 'min-h-[280px]',
          className,
        )}
      >
        <FileText className="size-8 text-fg-subtle" aria-hidden />
        <p className="mt-3 text-body-sm font-medium text-fg">
          {hasProof ? 'Proof URL unavailable' : 'No payment proof uploaded.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/10 bg-black/30',
            compact ? 'min-h-[140px]' : 'min-h-[280px]',
          )}
        >
          {loading ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-2 text-fg-muted',
                compact ? 'min-h-[140px]' : 'min-h-[280px]',
              )}
              aria-busy="true"
            >
              <div className="absolute inset-0 animate-pulse bg-white/[0.06]" />
              <Loader2 className="relative size-6 animate-spin" aria-hidden />
              <p className="relative text-caption">Loading proof…</p>
            </div>
          ) : error ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-4 text-center',
                compact ? 'min-h-[140px]' : 'min-h-[280px]',
              )}
            >
              <FileText className="size-8 text-warning" aria-hidden />
              <p className="text-caption font-medium text-warning">Proof unavailable</p>
              <p className="break-all text-[11px] text-fg-subtle">{error}</p>
            </div>
          ) : blobUrl && isImage ? (
            <button
              type="button"
              className="block w-full cursor-zoom-in"
              onClick={openLightbox}
              aria-label="Open payment proof fullscreen"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt="Payment proof"
                className={cn('w-full object-contain', compact ? 'max-h-48' : 'max-h-[70vh]')}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setNatural({ w: img.naturalWidth, h: img.naturalHeight })
                }}
              />
            </button>
          ) : blobUrl && isPdf ? (
            <iframe title="Payment proof" src={blobUrl} className="min-h-[320px] w-full bg-white" />
          ) : blobUrl ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 p-4">
              <FileText className="size-8 text-fg-muted" aria-hidden />
              <Button asChild size="sm" variant="secondary">
                <a href={blobUrl} download="deposit-proof">
                  Download proof
                </a>
              </Button>
            </div>
          ) : null}
        </div>
        {blobUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            {natural ? (
              <p className="text-[11px] text-fg-subtle">
                {natural.w} × {natural.h}px
              </p>
            ) : null}
            <Button type="button" size="sm" variant="secondary" onClick={openLightbox}>
              <Maximize2 aria-hidden />
              Expand
            </Button>
            <Button type="button" size="sm" variant="ghost" asChild>
              <a href={blobUrl} download="deposit-proof">
                <Download aria-hidden />
                Download
              </a>
            </Button>
          </div>
        ) : null}
      </div>
      {blobUrl ? (
        <ProofLightbox
          open={lightbox}
          onClose={() => setLightbox(false)}
          blobUrl={blobUrl}
          isImage={Boolean(isImage && !isPdf)}
          isPdf={isPdf}
          fileName="deposit-proof"
        />
      ) : null}
    </>
  )
}
