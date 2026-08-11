'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
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
import { DepositProofViewer } from '@/components/common/deposit-proof-viewer'
import { DualMoney } from '@/components/common/dual-money'
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

function firstRecord(items: unknown) {
  return Array.isArray(items) ? items.map(asRecord).find(Boolean) ?? null : null
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
  const userEmail = investor?.email ?? deposit.user?.email ?? '—'
  const userPhone = investor?.phone ?? deposit.user?.phone ?? '—'
  const submissionDetails = asRecord(deposit.submissionDetails)
  const paymentMethod = asRecord(deposit.paymentMethod) ?? asRecord(deposit.method)
  const accountDetails = asRecord(paymentMethod?.accountDetails)
  const walletDetails = firstRecord(paymentMethod?.cryptoWallets)
  const methodName =
    methodLabel(deposit.method) !== '—'
      ? methodLabel(deposit.method)
      : pickString(paymentMethod, ['name', 'type']) ?? '—'
  const coin =
    pickString(submissionDetails, ['coin', 'cryptoCoin', 'asset', 'token']) ??
    pickString(paymentMethod, ['coin', 'asset', 'currency']) ??
    pickString(walletDetails, ['coin', 'asset', 'symbol'])
  const network =
    pickString(submissionDetails, ['network', 'chain']) ??
    pickString(paymentMethod, ['network', 'chain']) ??
    pickString(walletDetails, ['network', 'chain'])
  const walletAddress =
    pickString(submissionDetails, ['walletAddress', 'depositAddress', 'address', 'toAddress', 'wallet']) ??
    pickString(accountDetails, ['walletAddress', 'depositAddress', 'address', 'wallet']) ??
    pickString(walletDetails, ['address', 'walletAddress'])
  const bankName =
    pickString(submissionDetails, ['bankName', 'beneficiaryBank']) ??
    pickString(asRecord(paymentMethod?.bank), ['bankName']) ??
    pickString(accountDetails, ['bankName', 'bank'])
  const accountHolder =
    pickString(submissionDetails, ['accountHolderName', 'accountName']) ??
    pickString(asRecord(paymentMethod?.bank), ['accountHolderName']) ??
    pickString(asRecord(paymentMethod?.upi), ['accountHolderName'])
  const accountNumber =
    pickString(submissionDetails, ['accountNumber']) ??
    pickString(asRecord(paymentMethod?.bank), ['accountNumber'])
  const ifsc =
    pickString(submissionDetails, ['ifscCode', 'ifsc']) ??
    pickString(asRecord(paymentMethod?.bank), ['ifscCode'])
  const branch =
    pickString(submissionDetails, ['branch']) ??
    pickString(asRecord(paymentMethod?.bank), ['branch'])
  const upiId =
    pickString(submissionDetails, ['upiId', 'payeeUpiId', 'upiIdUsed']) ??
    pickString(asRecord(paymentMethod?.upi), ['upiId'])
  const clientIp =
    deposit.clientIp ??
    pickString(submissionDetails, ['clientIp', 'ip']) ??
    null
  const userAgent =
    deposit.userAgent ??
    pickString(submissionDetails, ['userAgent']) ??
    null
  const submissionEntries = detailEntries(submissionDetails)

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
                  <DualMoney
                    usd={deposit.amount as MoneyString}
                    inr={
                      (deposit.amountInr ?? deposit.depositInr) as MoneyString | null | undefined
                    }
                    size="sm"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Currency</dt>
                <dd className="text-fg">{deposit.currency ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Email</dt>
                <dd className="break-all text-fg">{userEmail}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Phone</dt>
                <dd className="text-fg">{userPhone}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Payment Method</dt>
                <dd className="text-fg">{methodName}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Coin</dt>
                <dd className="text-fg">{coin ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Network</dt>
                <dd className="text-fg">{network ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Wallet Address</dt>
                <dd className="break-all font-mono text-fg">{walletAddress ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Bank name</dt>
                <dd className="text-fg">{bankName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Account holder</dt>
                <dd className="text-fg">{accountHolder ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Account number</dt>
                <dd className="break-all font-mono text-fg">{accountNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">IFSC</dt>
                <dd className="font-mono text-fg">{ifsc ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Branch</dt>
                <dd className="text-fg">{branch ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">UPI ID</dt>
                <dd className="break-all text-fg">{upiId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Hash</dt>
                <dd className="break-all font-mono text-fg">{deposit.txHash ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">UTR / Reference</dt>
                <dd className="break-all font-mono text-fg">{deposit.userReference ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Reference ID</dt>
                <dd className="font-mono text-fg">{deposit.reference}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Gateway</dt>
                <dd className="text-fg">
                  {pickString(submissionDetails, ['gateway']) === 'oxapay'
                    ? 'OxaPay'
                    : pickString(submissionDetails, ['gateway']) ?? deposit.gateway ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">OxaPay track ID</dt>
                <dd className="break-all font-mono text-fg">
                  {deposit.oxapayTrackId ??
                    pickString(submissionDetails, ['oxapayTrackId']) ??
                    (pickString(submissionDetails, ['gateway']) === 'oxapay'
                      ? deposit.userReference
                      : null) ??
                    '—'}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Confirmation</dt>
                <dd className="text-fg">
                  {deposit.reviewedAt ? formatDateTime(deposit.reviewedAt) : '—'}
                </dd>
                <dd className="text-[11px] text-fg-subtle">
                  {pickString(submissionDetails, ['oxapayConfirmedAt']) ||
                  pickString(submissionDetails, ['oxapayVerificationResult']) === 'ok'
                    ? 'Provider auto-confirmed'
                    : deposit.status === 'APPROVED'
                      ? 'Approved'
                      : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Submission Time</dt>
                <dd className="text-fg">{formatDateTime(deposit.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">IP</dt>
                <dd className="font-mono text-fg">{clientIp || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-fg-subtle">User agent</dt>
                <dd className="break-all text-fg">{userAgent || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-fg-subtle">Notes</dt>
                <dd className="whitespace-pre-wrap text-fg">{deposit.notes ?? '—'}</dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Submission details" />
            {submissionEntries.length > 0 ? (
              <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
                {submissionEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-fg-subtle">{formatDetailKey(key)}</dt>
                    <dd className="break-all text-fg">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-4 py-4 text-caption text-fg-muted sm:px-5">
                No additional submission details.
              </p>
            )}
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
                {asRecord(deposit.submissionDetails)?.gateway === 'oxapay' &&
                status === 'PENDING' ? (
                  <p className="text-caption text-fg-muted w-full">
                    OxaPay gateway deposit — wallet credits automatically after a verified paid
                    webhook. Manual approve only for reconciliation exceptions.
                  </p>
                ) : null}
                {asRecord(deposit.submissionDetails)?.gateway === 'oxapay' &&
                status === 'UNDER_REVIEW' ? (
                  <p className="text-caption text-fg-muted w-full">
                    OxaPay deposit needs review (verification issue or auto-confirm disabled). Use
                    Approve only after confirming payment details.
                  </p>
                ) : null}
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
              <p className="text-caption text-fg-muted">
                This deposit is already decided ({status}
                {asRecord(deposit.submissionDetails)?.gateway === 'oxapay' && status === 'APPROVED'
                  ? ' — OxaPay provider auto-confirm; no further Admin Approve needed'
                  : ''}
                ).
              </p>
            )}
          </AdminPanel>
        </div>

        <AdminPanel className="lg:sticky lg:top-24 lg:self-start" glow>
          <AdminPanelHeader title="Payment Screenshot" />
          <div className="p-4 sm:p-5">
            <DepositProofViewer
              proofUrl={deposit.proofImageUrl ?? deposit.proofUrl}
              hasProof={deposit.hasProof}
            />
          </div>
        </AdminPanel>
      </div>
    </div>
  )
}
