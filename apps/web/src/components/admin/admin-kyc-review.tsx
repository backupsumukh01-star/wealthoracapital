'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
import { kycService } from '@/services/kyc.service'

function DocSlot({ label }: { label: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-accent-500/10 via-inset to-info/10">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center">
        <p className="text-body-sm font-medium text-fg">{label}</p>
        <p className="text-caption text-fg-subtle">Preview placeholder · API upload later</p>
      </div>
    </div>
  )
}

export function AdminKycReviewWorkspace() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const userId = decodeURIComponent(params.userId)
  const { data: account, isLoading, isError } = useAdminUser(userId)
  const { data: kycDetail } = useQuery({
    queryKey: ['admin', 'kyc', userId],
    queryFn: () => kycService.adminGet(userId),
    enabled: Boolean(userId),
  })
  const [reason, setReason] = useState('')

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
      </div>
    )
  }

  if (isError || !account) {
    return (
      <div className="space-y-4">
        <PageHeader title="KYC review" description={`No investor matches ${userId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.kyc}>Back to queue</Link>
        </Button>
      </div>
    )
  }

  const submission = kycDetail as
    | {
        city?: string
        addressLine1?: string
        occupation?: string
        dateOfBirth?: string
        primaryDocumentType?: string
        country?: string
      }
    | undefined
  const country = submission?.country ?? account.country ?? '—'
  const busy = approve.isPending || reject.isPending || resubmit.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title={`KYC · ${account.firstName} ${account.lastName}`}
        description="Premium document review — approve, reject, or request resubmission."
        eyebrow={
          <Link href={ROUTES.admin.kyc} className="hover:text-fg">
            ← KYC queue
          </Link>
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
          <AdminPanelHeader title="Personal details" className="border-0 px-0 py-0" />
          <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
            {[
              ['User ID', account.id],
              ['Username', `@${account.email.split('@')[0] ?? account.id}`],
              ['Email', account.email],
              ['Phone', account.phone ?? '—'],
              ['Country', country],
              ['City', submission?.city ?? '—'],
              ['Address', submission?.addressLine1 ?? '—'],
              ['DOB', submission?.dateOfBirth ?? '—'],
              ['Occupation', submission?.occupation ?? '—'],
              ['ID type', submission?.primaryDocumentType?.replaceAll('_', ' ') ?? '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-caption text-fg-subtle">{k}</dt>
                <dd className="text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </AdminPanel>

        <AdminPanel className="space-y-4 p-4 sm:p-5">
          <AdminPanelHeader title="Decision" className="border-0 px-0 py-0" />
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for reject or resubmission…"
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
                  toast.error('Add a rejection reason')
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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DocSlot label="Front ID" />
        <DocSlot label="Back ID" />
        <DocSlot label="Selfie" />
      </div>
    </div>
  )
}
