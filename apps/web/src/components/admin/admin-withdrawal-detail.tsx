'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminWithdrawalRow,
  investorName,
  mapAccountStatus,
  mapKycStatus,
  mapWithdrawalStatus,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import {
  AdminAccountPill,
  AdminKycPill,
  AdminWithdrawalPill,
} from '@/components/admin/admin-status-pills'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminUser,
  useAdminWithdrawal,
  useReviewWithdrawal,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

type WithdrawalDecision = 'APPROVE' | 'REJECT' | 'PAID'

export function AdminWithdrawalDetailWorkspace() {
  const params = useParams<{ withdrawalId: string }>()
  const withdrawalId = decodeURIComponent(params.withdrawalId)
  const { data: withdrawalRaw, isLoading, isError } = useAdminWithdrawal(withdrawalId)
  const withdrawal = withdrawalRaw as AdminWithdrawalRow | undefined
  const userId = withdrawal?.user?.id ?? ''
  const { data: investor } = useAdminUser(userId, { enabled: Boolean(userId) })
  const reviewWithdrawal = useReviewWithdrawal()
  const [reason, setReason] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Withdrawal review" description="Loading withdrawal…" />
      </div>
    )
  }

  if (isError || !withdrawal) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Withdrawal not found"
          description={`No withdrawal matches ${withdrawalId}.`}
        />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.withdrawals}>Back to withdrawals</Link>
        </Button>
      </div>
    )
  }

  const status = withdrawal.status
  const pillStatus = mapWithdrawalStatus(status)
  const actionable = pillStatus === 'PENDING' || pillStatus === 'APPROVED'
  const name = investor
    ? `${investor.firstName} ${investor.lastName}`
    : investorName(withdrawal.user, withdrawal.user?.id ?? withdrawalId)

  async function decide(decision: WithdrawalDecision, title: string) {
    if (decision === 'REJECT' && !reason.trim()) {
      toast.error('Reason required to reject')
      return
    }
    try {
      await reviewWithdrawal.mutateAsync({
        id: withdrawal!.id,
        decision,
        reason: reason.trim() || undefined,
      })
      toast.success(title, { description: reason.trim() || withdrawal!.id })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Withdrawal review"
        description="Confirm the destination belongs to the investor, then approve, pay, or reject."
        eyebrow={
          <Link href={ROUTES.admin.withdrawals} className="hover:text-fg">
            ← Withdrawals
          </Link>
        }
        actions={<AdminWithdrawalPill status={pillStatus} />}
      />

      <Alert tone="warning" title="This action sends money">
        Approval is irreversible once the payment leaves. Check the destination against the
        investor&apos;s saved methods before continuing. Decisions are applied via the admin API.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel glow>
          <AdminPanelHeader title="Request" description={withdrawal.id} />
          <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
            <div>
              <dt className="text-fg-subtle">Investor</dt>
              <dd className="text-fg">
                {withdrawal.user?.id ? (
                  <Link
                    href={ROUTES.admin.user(withdrawal.user.id)}
                    className="text-accent-300 hover:underline"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
                <span className="text-fg-subtle"> · {withdrawal.user?.id ?? '—'}</span>
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Amount</dt>
              <dd>
                <Money value={withdrawal.amount as MoneyString} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Net amount</dt>
              <dd>
                <Money value={withdrawal.netAmount as MoneyString} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Destination</dt>
              <dd className="text-fg">{withdrawal.destinationLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-subtle">Bank / wallet detail</dt>
              <dd className="text-fg">{withdrawal.transactionRef ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Requested</dt>
              <dd className="text-fg">{formatDateTime(withdrawal.createdAt)}</dd>
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
              {withdrawal.user ? investorName(withdrawal.user) : 'Investor not found.'}
            </p>
          )}
        </AdminPanel>
      </div>

      <AdminPanel className="space-y-4 p-4 sm:p-5">
        <SectionHeader
          title="Decision"
          description="Rejection releases the locked amount back to available balance."
        />
        <FormField label="Reason / payment note" hint="Required when rejecting.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border-white/10 bg-white/[0.04]"
            placeholder="Optional on approve / mark paid…"
          />
        </FormField>
        {actionable ? (
          <div className="flex flex-wrap gap-2">
            {pillStatus === 'PENDING' ? (
              <Button
                size="sm"
                disabled={reviewWithdrawal.isPending}
                onClick={() => void decide('APPROVE', 'Withdrawal approved')}
              >
                Approve
              </Button>
            ) : null}
            {pillStatus === 'APPROVED' ? (
              <Button
                size="sm"
                disabled={reviewWithdrawal.isPending}
                onClick={() => void decide('PAID', 'Marked as paid')}
              >
                Mark paid
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="danger"
              disabled={reviewWithdrawal.isPending}
              onClick={() => void decide('REJECT', 'Withdrawal rejected')}
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="text-caption text-fg-muted">This withdrawal is already decided ({status}).</p>
        )}
      </AdminPanel>
    </div>
  )
}
