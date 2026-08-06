'use client'

import Link from 'next/link'
import { ROUTES, type User } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  mapAccountStatus,
  mapKycStatus,
} from '@/components/admin/admin-api-adapters'
import { AdminKycDocumentsGrid } from '@/components/admin/admin-kyc-review'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  loadAdminViewState,
  rememberAdminListLocation,
  restoreAdminScroll,
  saveAdminViewState,
} from '@/lib/admin-nav'
import { formatDateTime } from '@/lib/format'
import { kycService, type KycProfile } from '@/services/kyc.service'

type KycQueueItem = User & { kyc: KycProfile }

const kycAdminKeys = {
  queue: ['admin', 'kyc', 'queue'] as const,
}

const VIEW_KEY = 'admin:kyc-queue:view'

function KycReviewCard({
  account,
  onApprove,
  onReject,
  onResubmit,
  busy,
}: {
  account: KycQueueItem
  onApprove: (userId: string) => void | Promise<unknown>
  onReject: (userId: string, reason: string) => void | Promise<unknown>
  onResubmit: (userId: string, reason: string) => void | Promise<unknown>
  busy: boolean
}) {
  const [reason, setReason] = useState('')
  const country = account.country ?? '—'
  const submission = account.kyc.submission as
    | { city?: string; addressLine1?: string; occupation?: string; dateOfBirth?: string; primaryDocumentType?: string }
    | undefined
  const docs = (account.kyc.documents ?? []).map((d) => ({
    id: d.id,
    kind: d.kind,
    documentType: d.kind,
    side: d.side,
    status: d.status,
    mimeType: d.mimeType,
    originalName: d.originalName,
    downloadUrl: d.downloadUrl,
  }))

  function rememberAndOpen() {
    rememberAdminListLocation()
    saveAdminViewState(VIEW_KEY, {})
  }

  return (
    <AdminPanel className="overflow-hidden" glow>
      <AdminPanelHeader
        title={`${account.firstName} ${account.lastName}`}
        description={`${account.id} · ${account.email}`}
        action={
          <div className="flex flex-wrap gap-2">
            <AdminKycPill status={mapKycStatus(account.kycStatus)} />
            <AdminAccountPill status={mapAccountStatus(account.status, account.kycStatus)} />
          </div>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-5">
        <dl className="grid gap-3 text-caption sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['User ID', account.id],
            ['Email', account.email],
            ['Phone', account.phone ?? '—'],
            ['Country', country],
            ['City', submission?.city ?? '—'],
            ['Address', submission?.addressLine1 ?? '—'],
            ['Occupation', submission?.occupation ?? '—'],
            ['DOB', submission?.dateOfBirth ?? '—'],
            ['ID type', submission?.primaryDocumentType?.replaceAll('_', ' ') ?? '—'],
            ['Registered', formatDateTime(account.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-fg-subtle">{k}</dt>
              <dd className="mt-0.5 break-all text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-3 text-caption font-medium text-fg">Uploaded documents</p>
          <AdminKycDocumentsGrid ownerId={account.id} documents={docs} />
        </div>

        <FormField label="Decision reason" hint="Required for reject / resubmission.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required when rejecting or requesting resubmission…"
            className="border-white/10 bg-white/[0.04]"
          />
        </FormField>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              void onApprove(account.id)
            }}
          >
            <Check aria-hidden />
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => {
              const note = reason.trim()
              if (note.length < 3) {
                toast.error('Add a rejection reason (at least 3 characters)')
                return
              }
              void onReject(account.id, note)
            }}
          >
            <X aria-hidden />
            Reject
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              const note = reason.trim()
              if (note.length < 3) {
                toast.error('Add a resubmission note (at least 3 characters)')
                return
              }
              void onResubmit(account.id, note)
            }}
          >
            <RotateCcw aria-hidden />
            Request resubmission
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={ROUTES.admin.kycReview(account.id)} onClick={rememberAndOpen}>
              Full review
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={ROUTES.admin.user(account.id)} onClick={rememberAndOpen}>
              Full profile
            </Link>
          </Button>
        </div>
      </div>
    </AdminPanel>
  )
}

export function AdminKycQueue() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: kycAdminKeys.queue,
    queryFn: () => kycService.adminList({ status: 'UNDER_REVIEW' }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    rememberAdminListLocation()
    const saved = loadAdminViewState(VIEW_KEY)
    if (saved?.scrollY != null) restoreAdminScroll(saved.scrollY)
    const persist = () => saveAdminViewState(VIEW_KEY, {})
    window.addEventListener('pagehide', persist)
    return () => {
      persist()
      window.removeEventListener('pagehide', persist)
    }
  }, [])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: kycAdminKeys.queue })
  }

  const approve = useMutation({
    mutationFn: (userId: string) => kycService.adminApprove(userId),
    onSuccess: () => {
      invalidate()
      toast.success('KYC approved')
    },
    onError: (err: Error) => toast.error(err.message || 'Approve failed'),
  })
  const reject = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      kycService.adminReject(userId, { reason }),
    onSuccess: (_data, vars) => {
      invalidate()
      toast.message('KYC rejected', { description: vars.reason })
    },
    onError: (err: Error) => toast.error(err.message || 'Reject failed'),
  })
  const resubmit = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      kycService.adminRequestInformation(userId, { reason }),
    onSuccess: (_data, vars) => {
      invalidate()
      toast.success('Resubmission requested', { description: vars.reason })
    },
    onError: (err: Error) => toast.error(err.message || 'Request resubmission failed'),
  })

  const pending = (data?.items ?? []) as KycQueueItem[]
  const busy = approve.isPending || reject.isPending || resubmit.isPending

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="KYC queue"
        description="Review identity submissions. Open a request to see profile details and live document previews."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Pending review</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : pending.length}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">SLA</p>
          <p className="mt-2 text-stat-md text-fg">24–48h</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Notify on decision</p>
          <p className="mt-2 text-stat-md text-fg">Instant</p>
        </AdminPanel>
      </div>

      {pending.length === 0 ? (
        <AdminPanel className="p-10 text-center text-body-sm text-fg-muted">
          {isLoading ? 'Loading KYC queue…' : 'No KYC requests under review.'}
        </AdminPanel>
      ) : (
        <ul className="space-y-5">
          {pending.map((account) => (
            <li key={account.id}>
              <KycReviewCard
                account={account}
                busy={busy}
                onApprove={(userId) => approve.mutateAsync(userId)}
                onReject={(userId, reason) => reject.mutateAsync({ userId, reason })}
                onResubmit={(userId, reason) => resubmit.mutateAsync({ userId, reason })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
