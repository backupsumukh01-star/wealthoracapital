'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import type { MoneyWithdrawalStatus } from '@/lib/investor-lifecycle'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

export function AdminWithdrawalDetailWorkspace() {
  const params = useParams<{ withdrawalId: string }>()
  const withdrawalId = decodeURIComponent(params.withdrawalId)
  const {
    ready,
    withdrawals,
    accounts,
    approveWithdrawal,
    rejectWithdrawal,
    markWithdrawalPaid,
  } = useInvestorLifecycle()

  const withdrawal = useMemo(
    () => withdrawals.find((w) => w.id === withdrawalId),
    [withdrawals, withdrawalId],
  )
  const investor = useMemo(
    () => (withdrawal ? accounts.find((a) => a.userId === withdrawal.userId) : undefined),
    [accounts, withdrawal],
  )
  const [reason, setReason] = useState('')

  if (!ready) {
    return (
      <div className="space-y-4">
        <PageHeader title="Withdrawal review" description="Loading withdrawal…" />
      </div>
    )
  }

  if (!withdrawal) {
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
  const actionable = status === 'PENDING' || status === 'APPROVED'
  const investorName = investor
    ? `${investor.firstName} ${investor.lastName}`
    : withdrawal.userId
  const balance = (investor?.wallet.availableBalance ?? '0.00') as MoneyString

  function decide(next: MoneyWithdrawalStatus, title: string) {
    if (next === 'REJECTED' && !reason.trim()) {
      toast.error('Reason required to reject')
      return
    }
    if (next === 'APPROVED') approveWithdrawal(withdrawal!.id)
    else if (next === 'REJECTED') rejectWithdrawal(withdrawal!.id, reason.trim())
    else if (next === 'PAID') markWithdrawalPaid(withdrawal!.id)
    toast.success(title, { description: reason.trim() || withdrawal!.id })
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
        actions={<AdminWithdrawalPill status={status} />}
      />

      <Alert tone="warning" title="This action sends money">
        Approval is irreversible once the payment leaves. Check the destination against the
        investor&apos;s saved methods before continuing. Demo updates local status only.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel glow>
          <AdminPanelHeader title="Request" description={withdrawal.id} />
          <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
            <div>
              <dt className="text-fg-subtle">Investor</dt>
              <dd className="text-fg">
                <Link
                  href={ROUTES.admin.user(withdrawal.userId)}
                  className="text-accent-300 hover:underline"
                >
                  {investorName}
                </Link>
                <span className="text-fg-subtle"> · {withdrawal.userId}</span>
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Amount</dt>
              <dd>
                <Money value={withdrawal.amount as MoneyString} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Available balance</dt>
              <dd>
                <Money value={balance} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Destination</dt>
              <dd className="text-fg">{withdrawal.destination}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-subtle">Bank / wallet detail</dt>
              <dd className="text-fg">{withdrawal.destinationDetail}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Requested</dt>
              <dd className="text-fg">{formatDateTime(withdrawal.requestedAt)}</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Investor context" />
          {investor ? (
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <AdminKycPill status={investor.kycStatus} />
                <AdminAccountPill status={investor.status} />
              </div>
              <dl className="grid gap-3 text-caption sm:grid-cols-2">
                <div>
                  <dt className="text-fg-subtle">Wallet balance</dt>
                  <dd>
                    <Money value={investor.wallet.availableBalance as MoneyString} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Total withdrawn</dt>
                  <dd>
                    <Money value={investor.wallet.totalWithdrawn as MoneyString} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Email</dt>
                  <dd className="text-fg">{investor.email}</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Phone</dt>
                  <dd className="text-fg">{investor.phone}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="px-4 py-4 text-caption text-fg-muted sm:px-5">Investor not found.</p>
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
            {status === 'PENDING' ? (
              <Button size="sm" onClick={() => decide('APPROVED', 'Withdrawal approved')}>
                Approve
              </Button>
            ) : null}
            {status === 'APPROVED' ? (
              <Button size="sm" onClick={() => decide('PAID', 'Marked as paid')}>
                Mark paid
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="danger"
              onClick={() => decide('REJECTED', 'Withdrawal rejected')}
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
