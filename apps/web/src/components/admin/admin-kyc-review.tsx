'use client'

import { useParams, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  mapAccountStatus,
  mapKycStatus,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAdminUser } from '@/features/admin/hooks'
import { peekAdminListLocation } from '@/lib/admin-nav'
import { cn } from '@/lib/cn'
import { kycService } from '@/services/kyc.service'

type KycDoc = {
  id: string
  kind?: string
  documentType?: string
  side?: string
  mimeType?: string
  originalName?: string
  downloadUrl?: string
  storageKey?: string
  publicUrl?: string
  fileExists?: boolean
  absolutePath?: string | null
  status?: string
}

function docLabel(doc: KycDoc): string {
  const type = (doc.documentType ?? doc.kind ?? 'Document').replaceAll('_', ' ')
  const side = doc.side && doc.side !== 'SINGLE' ? ` · ${doc.side}` : ''
  return `${type}${side}`
}

function looksLikeImage(doc: KycDoc): boolean {
  if (doc.mimeType?.startsWith('image/')) return true
  const name = (doc.originalName ?? '').toLowerCase()
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(name)
}

function looksLikePdf(doc: KycDoc): boolean {
  return doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.originalName ?? '')
}

function useAdminDocPreview(ownerId: string | undefined, doc: KycDoc | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ownerId || !doc?.id) {
      setBlobUrl(null)
      setError(null)
      setLoading(false)
      return
    }

    if (doc.fileExists === false) {
      setBlobUrl(null)
      setLoading(false)
      setError('File missing on storage disk. Ask the investor to re-upload.')
      return
    }

    let objectUrl: string | null = null
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 45_000)

    setLoading(true)
    setError(null)
    setBlobUrl(null)

    void kycService
      .adminDocumentBlob(ownerId, doc.id, controller.signal)
      .then((blob) => {
        if (cancelled) return
        if (!blob || blob.size === 0) {
          setError('Empty document response from API.')
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch((err: Error) => {
        if (cancelled || err.name === 'AbortError') return
        const detail = err.message || 'Preview unavailable'
        console.error('[admin-kyc] document preview failed', {
          documentId: doc.id,
          ownerId,
          storageKey: doc.storageKey,
          error: err,
        })
        setError(detail)
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
  }, [ownerId, doc?.id, doc?.fileExists, doc?.storageKey])

  return { blobUrl, error, loading }
}

function DocumentLightbox({
  open,
  onClose,
  label,
  blobUrl,
  isImage,
  isPdf,
  fileName,
}: {
  open: boolean
  onClose: () => void
  label: string
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
      aria-label={`${label} preview`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <p className="truncate text-body-sm font-medium text-white">{label}</p>
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
          <Button type="button" size="sm" variant="secondary" asChild>
            <a href={blobUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              New tab
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
            alt={label}
            className="max-h-none origin-center transition-transform"
            style={{ transform: `scale(${zoom})` }}
          />
        ) : isPdf ? (
          <iframe title={label} src={blobUrl} className="h-full min-h-[70vh] w-full max-w-5xl bg-white" />
        ) : (
          <p className="text-body-sm text-white/80">Preview not available for this file type.</p>
        )}
      </div>
    </div>
  )
}

function KycDocCard({
  label,
  doc,
  ownerId,
}: {
  label: string
  doc?: KycDoc
  ownerId?: string
}) {
  const { blobUrl, error, loading } = useAdminDocPreview(ownerId, doc)
  const [lightbox, setLightbox] = useState(false)
  const isImage = doc ? looksLikeImage(doc) : false
  const isPdf = doc ? looksLikePdf(doc) : false
  const openLightbox = useCallback(() => {
    if (blobUrl) setLightbox(true)
  }, [blobUrl])

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-inset/40">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
          <p className="truncate text-body-sm font-medium text-fg">{label}</p>
          {blobUrl ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openLightbox}
                className="inline-flex items-center gap-1 text-caption text-accent-300 hover:underline"
              >
                Expand <Maximize2 className="size-3.5" aria-hidden />
              </button>
              <a
                href={blobUrl}
                download={doc?.originalName ?? 'document'}
                className="inline-flex items-center gap-1 text-caption text-accent-300 hover:underline"
              >
                Download <Download className="size-3.5" aria-hidden />
              </a>
            </div>
          ) : null}
        </div>
        <div className="relative aspect-[4/3] bg-gradient-to-br from-accent-500/10 via-inset to-info/10">
          {loading ? (
            <div
              className="absolute inset-0 animate-pulse bg-white/[0.06]"
              aria-busy="true"
              aria-label={`Loading ${label}`}
            />
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <FileText className="size-8 text-warning" aria-hidden />
              <p className="text-caption font-medium text-warning">Document unavailable</p>
              <p className="break-all text-[11px] text-fg-subtle">{error}</p>
              <p className="text-[11px] text-fg-subtle">
                If the file was uploaded before the persistent disk was attached, ask the investor to
                re-upload.
              </p>
            </div>
          ) : blobUrl && isImage ? (
            <button
              type="button"
              className="absolute inset-0 size-full cursor-zoom-in"
              onClick={openLightbox}
              aria-label={`Open ${label} full screen`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={blobUrl} alt={label} className="size-full object-contain p-2" />
            </button>
          ) : blobUrl && isPdf ? (
            <button
              type="button"
              className="absolute inset-0 size-full"
              onClick={openLightbox}
              aria-label={`Open ${label} full screen`}
            >
              <iframe title={label} src={blobUrl} className="pointer-events-none size-full bg-white" />
            </button>
          ) : blobUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <FileText className="size-8 text-fg-muted" aria-hidden />
              <p className="text-caption text-fg-muted">{doc?.originalName ?? 'Document uploaded'}</p>
              <Button asChild size="sm" variant="secondary">
                <a href={blobUrl} target="_blank" rel="noreferrer">
                  Open file
                </a>
              </Button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center">
              <p className={cn('text-body-sm font-medium text-fg')}>{label}</p>
              <p className="text-caption text-fg-subtle">No file uploaded</p>
            </div>
          )}
        </div>
      </div>
      {blobUrl ? (
        <DocumentLightbox
          open={lightbox}
          onClose={() => setLightbox(false)}
          label={label}
          blobUrl={blobUrl}
          isImage={isImage}
          isPdf={isPdf}
          fileName={doc?.originalName ?? 'document'}
        />
      ) : null}
    </>
  )
}

function resolveIdDocs(documents: KycDoc[]) {
  const typeOf = (d: KycDoc) => (d.documentType ?? d.kind ?? '').toUpperCase()
  const sideOf = (d: KycDoc) => (d.side ?? 'SINGLE').toUpperCase()

  const selfie =
    documents.find((d) => typeOf(d).includes('SELFIE')) ?? undefined
  const addressProof =
    documents.find((d) => typeOf(d).includes('ADDRESS')) ?? undefined

  const idKinds = ['NATIONAL_ID', 'DRIVING_LICENSE', 'RESIDENCE_PERMIT', 'PASSPORT', 'ID_CARD', 'GOVERNMENT_ID']
  const idDocs = documents.filter((d) => {
    const t = typeOf(d)
    if (d.id === selfie?.id || d.id === addressProof?.id) return false
    return (
      idKinds.some((k) => t === k) ||
      t.includes('PASSPORT') ||
      t.includes('LICENSE') ||
      t.includes('ID')
    )
  })

  const front =
    documents.find((d) => sideOf(d) === 'FRONT') ??
    idDocs.find((d) => sideOf(d) === 'SINGLE') ??
    idDocs[0]

  const back =
    documents.find((d) => sideOf(d) === 'BACK' && d.id !== front?.id) ??
    idDocs.find((d) => d.id !== front?.id)

  return { front, back, selfie, addressProof }
}

/** Shared document grid for KYC review + admin user detail. */
export function AdminKycDocumentsGrid({
  ownerId,
  documents,
  loading,
}: {
  ownerId: string
  documents: KycDoc[]
  loading?: boolean
}) {
  const { front, back, selfie, addressProof } = resolveIdDocs(documents)
  const extras = documents.filter(
    (d) =>
      d.id !== front?.id &&
      d.id !== back?.id &&
      d.id !== selfie?.id &&
      d.id !== addressProof?.id,
  )

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['Front ID', 'Back ID', 'Selfie', 'Address proof'].map((label) => (
          <div
            key={label}
            className="overflow-hidden rounded-xl border border-white/[0.08] bg-inset/40"
          >
            <div className="border-b border-white/[0.06] px-3 py-2">
              <p className="text-body-sm font-medium text-fg">{label}</p>
            </div>
            <div
              className="relative aspect-[4/3] animate-pulse bg-white/[0.06]"
              aria-busy="true"
              aria-label={`Loading ${label}`}
            />
          </div>
        ))}
      </div>
    )
  }
  if (documents.length === 0) {
    return (
      <AdminPanel className="p-6 text-body-sm text-fg-muted">
        No documents are attached to this KYC submission. Ask the investor to upload again.
      </AdminPanel>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KycDocCard label="Front ID" doc={front} ownerId={ownerId} />
      <KycDocCard label="Back ID" doc={back} ownerId={ownerId} />
      <KycDocCard label="Selfie" doc={selfie} ownerId={ownerId} />
      <KycDocCard label="Address proof" doc={addressProof} ownerId={ownerId} />
      {extras.map((doc) => (
        <KycDocCard key={doc.id} label={docLabel(doc)} doc={doc} ownerId={ownerId} />
      ))}
    </div>
  )
}

export function AdminKycReviewWorkspace() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const userId = decodeURIComponent(params.userId)
  const { data: account, isLoading, isError } = useAdminUser(userId)
  const { data: kycDetail, isLoading: kycLoading, isError: kycError } = useQuery({
    queryKey: ['admin', 'kyc', userId],
    queryFn: () => kycService.adminGet(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (count, err) => {
      if (err instanceof Error && 'status' in err && (err as { status?: number }).status === 429) {
        return count < 1
      }
      return count < 1
    },
  })
  const [reason, setReason] = useState('')
  const [reasonPreset, setReasonPreset] = useState('')

  const REJECTION_PRESETS = [
    'Document blurry',
    'Photo cropped',
    'Address proof expired',
    'Name mismatch',
    'Other',
  ] as const

  function goBackToQueue() {
    const remembered = peekAdminListLocation()
    if (remembered && (remembered.startsWith('/admin/kyc') || remembered.startsWith('/admin/users'))) {
      router.push(remembered)
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(ROUTES.admin.kyc)
  }

  const applyPreset = (preset: string) => {
    setReasonPreset(preset)
    if (preset === 'Other') {
      setReason((prev) => prev.trim() || '')
      return
    }
    setReason(preset)
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] })
  }

  const approve = useMutation({
    mutationFn: () => kycService.adminApprove(userId),
    onSuccess: () => {
      invalidate()
      toast.success('KYC approved')
      router.push(ROUTES.admin.kyc)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const reject = useMutation({
    mutationFn: (note: string) => kycService.adminReject(userId, { reason: note }),
    onSuccess: (_data, note) => {
      invalidate()
      toast.message('KYC rejected', { description: note })
      router.push(ROUTES.admin.kyc)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const resubmit = useMutation({
    mutationFn: (note: string) => kycService.adminRequestInformation(userId, { reason: note }),
    onSuccess: (_data, note) => {
      invalidate()
      toast.message('Resubmission requested', { description: note })
      router.push(ROUTES.admin.kyc)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="KYC review" description="Loading investor…" />
        <AdminKycDocumentsGrid ownerId={userId} documents={[]} loading />
      </div>
    )
  }

  if (isError || !account) {
    return (
      <div className="space-y-4">
        <PageHeader title="KYC review" description={`No investor matches ${userId}.`} />
        <Button type="button" variant="secondary" onClick={goBackToQueue}>
          Back to queue
        </Button>
      </div>
    )
  }

  const submission = kycDetail
  // Prefer the user id from the route — resolveSubmission accepts user or submission id.
  const ownerId = userId
  const documents = (submission?.documents ?? []) as KycDoc[]
  const country = submission?.country ?? account.country ?? '—'
  const busy = approve.isPending || reject.isPending || resubmit.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title={`KYC · ${account.firstName} ${account.lastName}`}
        description="Profile, personal details, and uploaded documents — all on this page."
        eyebrow={
          <button type="button" onClick={goBackToQueue} className="hover:text-fg">
            ← KYC queue
          </button>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminKycPill status={mapKycStatus(account.kycStatus)} />
            <AdminAccountPill status={mapAccountStatus(account.status, account.kycStatus)} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel className="space-y-4 p-4 sm:p-5">
          <AdminPanelHeader title="User profile" className="border-0 px-0 py-0" />
          <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
            {[
              ['User ID', account.id],
              ['Name', `${account.firstName} ${account.lastName}`],
              ['Email', account.email],
              ['Phone', account.phone ?? '—'],
              ['Account status', account.status],
              ['KYC status', account.kycStatus],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-caption text-fg-subtle">{k}</dt>
                <dd className="break-all text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </AdminPanel>

        <AdminPanel className="space-y-4 p-4 sm:p-5">
          <AdminPanelHeader title="Personal details" className="border-0 px-0 py-0" />
          {kycError && !submission ? (
            <p className="text-body-sm text-warning">Could not load KYC submission details.</p>
          ) : null}
          <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
            {[
              ['Country', country],
              ['City', submission?.city ?? '—'],
              ['Address', submission?.addressLine1 ?? '—'],
              ['DOB', submission?.dateOfBirth ?? '—'],
              ['Occupation', submission?.occupation ?? '—'],
              ['ID type', submission?.primaryDocumentType?.replaceAll('_', ' ') ?? '—'],
              ['Documents', String(documents.length)],
              ['Submission', submission?.id ?? '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-caption text-fg-subtle">{k}</dt>
                <dd className="break-all text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </AdminPanel>
      </div>

      <div>
        <h2 className="mb-3 text-heading-sm text-fg">Uploaded documents</h2>
        <AdminKycDocumentsGrid
          ownerId={ownerId}
          documents={documents}
          loading={kycLoading}
        />
      </div>

      <AdminPanel className="space-y-4 p-4 sm:p-5">
        <AdminPanelHeader title="Decision" className="border-0 px-0 py-0" />
        <div className="flex flex-wrap gap-2">
          {REJECTION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-caption transition',
                reasonPreset === preset
                  ? 'border-accent/40 bg-accent/10 text-fg'
                  : 'border-white/[0.08] text-fg-muted hover:border-white/20 hover:text-fg',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
        <Textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            if (reasonPreset && reasonPreset !== 'Other' && e.target.value !== reasonPreset) {
              setReasonPreset('Other')
            }
          }}
          placeholder="Rejection reason is required to reject…"
          rows={4}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => approve.mutate()}>
            Approve
          </Button>
          <Button
            variant="secondary"
            className="text-danger"
            disabled={busy}
            onClick={() => {
              if (!reason.trim()) {
                toast.error('Rejection reason is required')
                return
              }
              reject.mutate(reason.trim())
            }}
          >
            Reject
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!reason.trim()) {
                toast.error('Add a resubmission note')
                return
              }
              resubmit.mutate(reason.trim())
            }}
          >
            Request resubmission
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel className="space-y-3 p-4 sm:p-5">
        <AdminPanelHeader
          title="Audit trail"
          description="Every KYC event with admin, status change, reason, and IP"
          className="border-0 px-0 py-0"
        />
        {(submission?.history ?? []).length === 0 ? (
          <p className="text-body-sm text-fg-muted">No history recorded yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {(
              submission?.history as Array<{
                id: string
                action: string
                actorName?: string | null
                actorEmail?: string | null
                oldStatus?: string | null
                newStatus?: string | null
                reason?: string | null
                ip?: string | null
                createdAt: string
                message?: string | null
              }>
            ).map((h) => (
              <li key={h.id} className="grid gap-1 py-3 text-caption sm:grid-cols-[140px_1fr]">
                <time className="text-fg-subtle">{new Date(h.createdAt).toLocaleString()}</time>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-fg">{h.action.replaceAll('_', ' ')}</p>
                  {(h.oldStatus || h.newStatus) && (
                    <p className="text-fg-muted">
                      {h.oldStatus ?? '—'} → {h.newStatus ?? '—'}
                    </p>
                  )}
                  {(h.actorName || h.actorEmail) && (
                    <p className="text-fg-subtle">
                      {[h.actorName, h.actorEmail].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {(h.reason || h.message) && (
                    <p className="text-fg-muted">Reason: {h.reason || h.message}</p>
                  )}
                  {h.ip && <p className="font-mono text-[11px] text-fg-subtle">IP {h.ip}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}
