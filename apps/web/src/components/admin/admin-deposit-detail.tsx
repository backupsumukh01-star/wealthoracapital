'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { FileImage } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminDepositPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import type { MoneyDepositStatus } from '@/lib/investor-lifecycle'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

export function AdminDepositDetailWorkspace() {
  const params = useParams<{ depositId: string }>()
  const depositId = decodeURIComponent(params.depositId)
  const { ready, deposits, accounts, approveDeposit, rejectDeposit, needInfoDeposit } =
    useInvestorLifecycle()

  const deposit = useMemo(
    () => deposits.find((d) => d.id === depositId),
    [deposits, depositId],
  )
  const investor = useMemo(
    () => (deposit ? accounts.find((a) => a.userId === deposit.userId) : undefined),
    [accounts, deposit],
  )
  const [reason, setReason] = useState('')

  if (!ready) {
    return (
      <div className="space-y-4">
        <PageHeader title="Deposit review" description="Loading deposit…" />
      </div>
    )
  }

  if (!deposit) {
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
  const actionable =
    status === 'PENDING' || status === 'UNDER_REVIEW' || status === 'NEED_INFO'
  const investorName = investor
    ? `${investor.firstName} ${investor.lastName}`
    : deposit.userId

  function decide(next: MoneyDepositStatus, title: string) {
    if ((next === 'REJECTED' || next === 'NEED_INFO') && !reason.trim()) {
      toast.error('Reason required')
      return
    }
    if (next === 'APPROVED') approveDeposit(deposit!.id)
    else if (next === 'REJECTED') rejectDeposit(deposit!.id, reason.trim())
    else if (next === 'NEED_INFO') needInfoDeposit(deposit!.id, reason.trim())
    toast.success(title, { description: reason.trim() || deposit!.id })
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
        actions={<AdminDepositPill status={status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <AdminPanel glow>
            <AdminPanelHeader title="Request" description={deposit.id} />
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              <div>
                <dt className="text-fg-subtle">Investor</dt>
                <dd className="text-fg">
                  <Link
                    href={ROUTES.admin.user(deposit.userId)}
                    className="text-accent-300 hover:underline"
                  >
                    {investorName}
                  </Link>
                  <span className="text-fg-subtle"> · {deposit.userId}</span>
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
                <dd className="text-fg">{deposit.method}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Reference</dt>
                <dd className="font-mono text-fg">{deposit.reference}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Submitted</dt>
                <dd className="text-fg">{formatDateTime(deposit.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Proof file</dt>
                <dd className="text-fg">{deposit.proofLabel ?? '—'}</dd>
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
                    <dt className="text-fg-subtle">Total deposited</dt>
                    <dd>
                      <Money value={investor.wallet.totalDeposited as MoneyString} size="sm" />
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="px-4 py-4 text-caption text-fg-muted sm:px-5">Investor not found.</p>
            )}
          </AdminPanel>

          <AdminPanel className="space-y-4 p-4 sm:p-5">
            <SectionHeader
              title="Decision"
              description="Approval credits the wallet in production. Demo updates local status only."
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
                <Button size="sm" onClick={() => decide('APPROVED', 'Deposit approved')}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => decide('NEED_INFO', 'More info requested')}
                >
                  Need info
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => decide('REJECTED', 'Deposit rejected')}
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
                <p className="text-heading-sm text-fg">{deposit.proofLabel ?? 'Proof'}</p>
                <p className="mt-1 text-caption text-fg-subtle">
                  Zoomable proof viewer placeholder · demo asset
                </p>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </div>
  )
}
