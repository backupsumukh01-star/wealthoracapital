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
import { AdminAttributionPanel } from '@/components/admin/admin-attribution-panel'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import {
  AdminAccountPill,
  AdminKycPill,
  AdminWithdrawalPill,
} from '@/components/admin/admin-status-pills'
import { DualMoney } from '@/components/common/dual-money'
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

type WithdrawalDecision = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION' | 'PAID'
type DetailRecord = Record<string, unknown>

function asRecord(value: unknown): DetailRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as DetailRecord)
    : null
}

function displayValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

function pickString(record: DetailRecord | null | undefined, keys: string[]) {
  if (!record) return null
  for (const key of keys) {
    const value = displayValue(record[key])
    if (value) return value
  }
  return null
}

function formatDetailKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function detailEntries(record: DetailRecord | null) {
  return Object.entries(record ?? {})
    .map(([key, value]) => [key, displayValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
}

function summarizeKeys(record: DetailRecord | null, keys: string[]) {
  const parts = keys
    .map((key) => {
      const value = displayValue(record?.[key])
      return value ? `${formatDetailKey(key)}: ${value}` : null
    })
    .filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

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
  const userEmail = investor?.email ?? withdrawal.user?.email ?? '—'
  const userPhone = investor?.phone ?? withdrawal.user?.phone ?? '—'
  const destinationSnapshot = asRecord(withdrawal.destinationSnapshot)
  const payoutMethod = asRecord(withdrawal.payoutMethod)
  const destinationEntries = detailEntries(destinationSnapshot)
  const method =
    pickString(payoutMethod, ['label', 'type']) ??
    pickString(destinationSnapshot, ['method', 'type', 'destinationType']) ??
    withdrawal.destinationLabel
  const coin = pickString(destinationSnapshot, ['coin', 'cryptoCoin', 'asset', 'token'])
  const network = pickString(destinationSnapshot, ['network', 'chain'])
  const walletAddress = pickString(destinationSnapshot, [
    'walletAddress',
    'address',
    'wallet',
    'toAddress',
  ])
  const bankDetails =
    pickString(destinationSnapshot, ['bankDetails']) ??
    summarizeKeys(destinationSnapshot, [
      'bankName',
      'accountName',
      'accountNumber',
      'ifsc',
      'iban',
      'routingNumber',
    ])
  const upi = pickString(destinationSnapshot, ['upi', 'upiId', 'vpa'])

  async function decide(decision: WithdrawalDecision, title: string) {
    if ((decision === 'REJECT' || decision === 'REQUEST_INFORMATION') && !reason.trim()) {
      toast.error('Reason required')
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
                <DualMoney
                  usd={withdrawal.amount as MoneyString}
                  inr={
                    (withdrawal.amountInr ?? withdrawal.withdrawInr) as
                      | MoneyString
                      | null
                      | undefined
                  }
                  size="sm"
                />
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Currency</dt>
              <dd className="text-fg">{withdrawal.currency ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Net amount</dt>
              <dd>
                <Money value={withdrawal.netAmount as MoneyString} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Method</dt>
              <dd className="text-fg">{method}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Destination</dt>
              <dd className="text-fg">{withdrawal.destinationLabel}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Coin</dt>
              <dd className="text-fg">{coin ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Network</dt>
              <dd className="text-fg">{network ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-subtle">Wallet Address</dt>
              <dd className="break-all font-mono text-fg">{walletAddress ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-subtle">Bank Details</dt>
              <dd className="break-all text-fg">{bankDetails ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">UPI</dt>
              <dd className="break-all font-mono text-fg">{upi ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Payment reference</dt>
              <dd className="break-all font-mono text-fg">{withdrawal.transactionRef ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">OTP Verified</dt>
              <dd className="text-fg">
                {withdrawal.otpVerifiedAt ? formatDateTime(withdrawal.otpVerifiedAt) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Reference ID</dt>
              <dd className="font-mono text-fg">{withdrawal.reference}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Requested</dt>
              <dd className="text-fg">{formatDateTime(withdrawal.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Status</dt>
              <dd className="text-fg">{status}</dd>
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

      <AdminAttributionPanel
        attribution={{
          referral: withdrawal.referral ?? null,
          salesman: withdrawal.salesman ?? null,
        }}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel>
          <AdminPanelHeader title="Destination snapshot" />
          {destinationEntries.length > 0 ? (
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              {destinationEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-fg-subtle">{formatDetailKey(key)}</dt>
                  <dd className="break-all text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="px-4 py-4 text-caption text-fg-muted sm:px-5">
              No destination snapshot was returned.
            </p>
          )}
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Timeline" />
          <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
            <div>
              <dt className="text-fg-subtle">Created</dt>
              <dd className="text-fg">{formatDateTime(withdrawal.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Reviewed</dt>
              <dd className="text-fg">
                {withdrawal.reviewedAt ? formatDateTime(withdrawal.reviewedAt) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Paid</dt>
              <dd className="text-fg">
                {withdrawal.paidAt ? formatDateTime(withdrawal.paidAt) : '—'}
              </dd>
            </div>
          </dl>
        </AdminPanel>
      </div>

      <AdminPanel className="space-y-4 p-4 sm:p-5">
        <SectionHeader
          title="Decision"
          description="Rejection releases the locked amount back to available balance."
        />
        <FormField label="Reason / payment note" hint="Required when rejecting or requesting info.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border-white/10 bg-white/[0.04]"
            placeholder="Optional on approve / mark paid..."
          />
        </FormField>
        {actionable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={reviewWithdrawal.isPending || pillStatus !== 'PENDING'}
              onClick={() => void decide('APPROVE', 'Withdrawal approved')}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={reviewWithdrawal.isPending}
              onClick={() => void decide('REQUEST_INFORMATION', 'More info requested')}
            >
              Need More Info
            </Button>
            <Button
              size="sm"
              disabled={reviewWithdrawal.isPending || pillStatus !== 'APPROVED'}
              onClick={() => void decide('PAID', 'Marked as paid')}
            >
              Mark Paid
            </Button>
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
