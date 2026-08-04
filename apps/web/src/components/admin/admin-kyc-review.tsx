'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

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
  const userId = decodeURIComponent(params.userId)
  const { ready, accounts, approveKyc, rejectKyc, requestKycResubmit } = useInvestorLifecycle()
  const account = useMemo(
    () => accounts.find((a) => a.userId === userId),
    [accounts, userId],
  )
  const [reason, setReason] = useState('')

  if (!ready) {
    return (
      <div className="space-y-4">
        <PageHeader title="KYC review" description="Loading investor…" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <PageHeader title="KYC review" description={`No investor matches ${userId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.kyc}>Back to queue</Link>
        </Button>
      </div>
    )
  }

  const country = account.kyc?.country ?? account.country ?? '—'

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
            <AdminKycPill status={account.kycStatus} />
            <AdminAccountPill status={account.status} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel className="space-y-4 p-4 sm:p-5">
          <AdminPanelHeader title="Personal details" className="border-0 px-0 py-0" />
          <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
            {[
              ['User ID', account.userId],
              ['Username', `@${account.username}`],
              ['Email', account.email],
              ['Phone', account.phone],
              ['Country', country],
              ['City', account.kyc?.city ?? '—'],
              ['Address', account.kyc?.address ?? '—'],
              ['DOB', account.kyc?.dateOfBirth ?? '—'],
              ['Occupation', account.kyc?.occupation ?? '—'],
              ['ID type', account.kyc?.idType?.replaceAll('_', ' ') ?? '—'],
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
            <Button
              onClick={() => {
                approveKyc(account.userId)
                toast.success('KYC approved')
                router.push(ROUTES.admin.kyc)
              }}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              className="text-danger"
              onClick={() => {
                if (!reason.trim()) {
                  toast.error('Add a rejection reason')
                  return
                }
                rejectKyc(account.userId, reason.trim())
                toast.message('KYC rejected', { description: reason })
                router.push(ROUTES.admin.kyc)
              }}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (!reason.trim()) {
                  toast.error('Add a resubmission note')
                  return
                }
                requestKycResubmit(account.userId, reason.trim())
                toast.message('Resubmission requested', { description: reason })
                router.push(ROUTES.admin.kyc)
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
