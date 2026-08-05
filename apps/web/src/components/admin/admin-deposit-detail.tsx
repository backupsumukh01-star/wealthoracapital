'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { FileImage } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminDepositRow,
  investorName,
  mapAccountStatus,
  mapDepositStatus,
  mapKycStatus,
  methodLabel,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminDepositPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminDeposit,
  useAdminUser,
  useReviewDeposit,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

type DepositDecision = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION'

export function AdminDepositDetailWorkspace() {
  const params = useParams<{ depositId: string }>()
  const depositId = decodeURIComponent(params.depositId)
  const { data: depositRaw, isLoading, isError } = useAdminDeposit(depositId)
  const deposit = depositRaw as AdminDepositRow | undefined
  const userId = deposit?.user?.id ?? ''
  const { data: investor } = useAdminUser(userId, { enabled: Boolean(userId) })
  const reviewDeposit = useReviewDeposit()
  const [reason, setReason] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Deposit review" description="Loading deposit…" />
      </div>
    )
  }

  if (isError || !deposit) {
    return (
      <div className="space-y-4">
        <PageHeader title="Deposit not found" description={`No deposit matches ${depositId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.deposits}>Back to deposits</Link>
        </Button>
      </div>
    )
  }

  const status = deposit.status
  const pillStatus = mapDepositStatus(status)
  const actionable = status === 'PENDING' || status === 'UNDER_REVIEW'
  const name = investor
    ? `${investor.firstName} ${investor.lastName}`
    : investorName(deposit.user, deposit.user?.id ?? depositId)

  async function decide(decision: DepositDecision, title: string) {
    if ((decision === 'REJECT' || decision === 'REQUEST_INFORMATION') && !reason.trim()) {
      toast.error('Reason required')
      return
    }
    try {
      await reviewDeposit.mutateAsync({
        id: deposit!.id,
        decision,
        reason: reason.trim() || undefined,
      })
      toast.success(title, { description: reason.trim() || deposit!.id })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Deposit review"
        description="Check the proof against the payment received, then approve or reject with a reason."
        eyebrow={
          <Link href={ROUTES.admin.deposits} className="hover:text-fg">
            ← Deposits
          </Link>
        }
        actions={<AdminDepositPill status={pillStatus} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <AdminPanel glow>
            <AdminPanelHeader title="Request" description={deposit.id} />
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              <div>
                <dt className="text-fg-subtle">Investor</dt>
                <dd className="text-fg">
                  {deposit.user?.id ? (
                    <Link
                      href={ROUTES.admin.user(deposit.user.id)}
                      className="text-accent-300 hover:underline"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  <span className="text-fg-subtle"> · {deposit.user?.id ?? '—'}</span>
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Amount</dt>
                <dd>
                  <Money value={deposit.amount as MoneyString} size="sm" />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Method</dt>
                <dd className="text-fg">{methodLabel(deposit.method)}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Reference</dt>
                <dd className="font-mono text-fg">{deposit.reference}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Submitted</dt>
                <dd className="text-fg">{formatDateTime(deposit.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Proof file</dt>
                <dd className="text-fg">{deposit.hasProof ? 'On file' : '—'}</dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Investor context" />
            {investor ? (
              <div className="space-y-4 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap gap-2">
                  <AdminKycPill status={mapKycStatus(investor.kycStatus)} />
                  <AdminAccountPill status={mapAccountStatus(investor.status, investor.kycStatus)} />
                </div>
                <dl className="grid gap-3 text-caption sm:grid-cols-2">
                  <div>
                    <dt className="text-fg-subtle">Email</dt>
                    <dd className="text-fg">{investor.email}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Phone</dt>
                    <dd className="text-fg">{investor.phone ?? '—'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="px-4 py-4 text-caption text-fg-muted sm:px-5">
                {deposit.user ? investorName(deposit.user) : 'Investor not found.'}
              </p>
            )}
          </AdminPanel>

          <AdminPanel className="space-y-4 p-4 sm:p-5">
            <SectionHeader
              title="Decision"
              description="Approval credits the wallet in production via the admin API."
            />
            <FormField label="Reason / note" hint="Required when rejecting or requesting info.">
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border-white/10 bg-white/[0.04]"
                placeholder="Optional on approve…"
              />
            </FormField>
            {actionable ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={reviewDeposit.isPending}
                  onClick={() => void decide('APPROVE', 'Deposit approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={reviewDeposit.isPending}
                  onClick={() => void decide('REQUEST_INFORMATION', 'More info requested')}
                >
                  Need info
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={reviewDeposit.isPending}
                  onClick={() => void decide('REJECT', 'Deposit rejected')}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <p className="text-caption text-fg-muted">This deposit is already decided ({status}).</p>
            )}
          </AdminPanel>
        </div>

        <AdminPanel className="lg:sticky lg:top-24 lg:self-start" glow>
          <AdminPanelHeader title="Proof of payment" />
          <div className="p-4 sm:p-5">
            <div className="flex min-h-[320px] flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-accent-500/35 via-info/20 to-transparent p-6">
              <FileImage className="size-8 text-accent-300" aria-hidden />
              <div>
                <p className="text-heading-sm text-fg">{deposit.hasProof ? 'Proof on file' : 'No proof'}</p>
                <p className="mt-1 text-caption text-fg-subtle">
                  Zoomable proof viewer placeholder
                </p>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </div>
  )
}
