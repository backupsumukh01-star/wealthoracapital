'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Check, FileImage, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import type { InvestorAccount } from '@/lib/investor-lifecycle'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

function DocPreview({
  label,
  accent,
}: {
  label: string
  accent: 'front' | 'back' | 'selfie'
}) {
  const gradients = {
    front: 'from-accent-500/35 via-info/20 to-transparent',
    back: 'from-info/30 via-accent-500/15 to-transparent',
    selfie: 'from-warning/25 via-accent-500/20 to-transparent',
  } as const

  return (
    <div
      className={`relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${gradients[accent]} p-3`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.08),transparent_55%)]" />
      <div className="relative flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        <FileImage className="size-3.5 text-accent-300" aria-hidden />
        {label}
      </div>
      <p className="relative text-caption text-fg-subtle">Preview placeholder · demo asset</p>
    </div>
  )
}

function KycReviewCard({
  account,
  onApprove,
  onReject,
  onResubmit,
}: {
  account: InvestorAccount
  onApprove: (userId: string) => void
  onReject: (userId: string, reason: string) => void
  onResubmit: (userId: string, reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const country = account.kyc?.country ?? account.country ?? '—'

  return (
    <AdminPanel className="overflow-hidden" glow>
      <AdminPanelHeader
        title={`${account.firstName} ${account.lastName}`}
        description={`${account.userId} · @${account.username}`}
        action={
          <div className="flex flex-wrap gap-2">
            <AdminKycPill status={account.kycStatus} />
            <AdminAccountPill status={account.status} />
          </div>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-5">
        <dl className="grid gap-3 text-caption sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Email', account.email],
            ['Phone', account.phone],
            ['Country', country],
            ['City', account.kyc?.city ?? '—'],
            ['Address', account.kyc?.address ?? '—'],
            ['Occupation', account.kyc?.occupation ?? '—'],
            ['DOB', account.kyc?.dateOfBirth ?? '—'],
            ['ID type', account.kyc?.idType?.replaceAll('_', ' ') ?? '—'],
            ['Registered', formatDateTime(account.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-fg-subtle">{k}</dt>
              <dd className="mt-0.5 text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3 sm:grid-cols-3">
          <DocPreview label="Front ID" accent="front" />
          <DocPreview label="Back ID" accent="back" />
          <DocPreview label="Selfie" accent="selfie" />
        </div>

        <FormField label="Decision reason" hint="Required for reject / resubmission.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional note for approve; required when rejecting or requesting resubmission…"
            className="border-white/10 bg-white/[0.04]"
          />
        </FormField>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              onApprove(account.userId)
              toast.success('KYC approved', {
                description: `${account.userId} is verified. Deposits unlocked.`,
              })
            }}
          >
            <Check aria-hidden />
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              const note = reason.trim() || 'Documents unclear. Please re-upload.'
              onReject(account.userId, note)
              toast.message('KYC rejected', { description: note })
            }}
          >
            <X aria-hidden />
            Reject
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const note = reason.trim() || 'Please replace blurry documents.'
              onResubmit(account.userId, note)
              toast.message('Resubmission requested', { description: note })
            }}
          >
            <RotateCcw aria-hidden />
            Request resubmission
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={ROUTES.admin.kycReview(account.userId)}>Open review</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={ROUTES.admin.user(account.userId)}>Full profile</Link>
          </Button>
        </div>
      </div>
    </AdminPanel>
  )
}

export function AdminKycQueue() {
  const { pendingKycAccounts, approveKyc, rejectKyc, requestKycResubmit } = useInvestorLifecycle()

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="KYC queue"
        description="Premium review cards for identity verification. Approve, reject, or request resubmission."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Pending review</p>
          <p className="mt-2 text-stat-md text-fg">{pendingKycAccounts.length}</p>
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

      {pendingKycAccounts.length === 0 ? (
        <AdminPanel className="p-10 text-center text-body-sm text-fg-muted">
          No KYC requests under review.
        </AdminPanel>
      ) : (
        <ul className="space-y-5">
          {pendingKycAccounts.map((account) => (
            <li key={account.userId}>
              <KycReviewCard
                account={account}
                onApprove={approveKyc}
                onReject={rejectKyc}
                onResubmit={requestKycResubmit}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
