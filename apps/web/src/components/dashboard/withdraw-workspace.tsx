'use client'

import { useMemo, useState } from 'react'
import type { MoneyString, PaymentMethodType, PayoutMethod, Withdrawal } from '@meridian/shared'
import { Building2, ShieldCheck, Wallet } from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import {
  useCreatePayoutMethod,
  useCreateWithdrawal,
  usePayoutMethods,
  useRequestWithdrawalOtp,
  useWithdrawalLimits,
  useWithdrawals,
} from '@/features/withdrawals/hooks'
import { ApiError } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

type WithdrawalMethod = Extract<
  PaymentMethodType,
  'BANK_TRANSFER' | 'UPI' | 'USDT_TRC20' | 'USDT_BEP20' | 'BTC' | 'ETH'
>

const METHOD_OPTIONS: Array<{ value: WithdrawalMethod; label: string }> = [
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'UPI', label: 'UPI' },
  { value: 'USDT_TRC20', label: 'USDT TRC20' },
  { value: 'USDT_BEP20', label: 'USDT BEP20' },
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
]

const PENDING_STATUSES = new Set(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'])

function money(value: number): MoneyString {
  return value.toFixed(2) as MoneyString
}

function toNumber(value: string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function methodLabel(method: WithdrawalMethod) {
  return METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method
}

function cryptoDefaults(method: WithdrawalMethod) {
  if (method === 'USDT_TRC20') return { coin: 'USDT', network: 'TRC20' }
  if (method === 'USDT_BEP20') return { coin: 'USDT', network: 'BEP20' }
  if (method === 'BTC') return { coin: 'BTC', network: 'BTC' }
  if (method === 'ETH') return { coin: 'ETH', network: 'ETH' }
  return { coin: '', network: '' }
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.'
}

function PayoutMethodList({
  methods,
  isLoading,
}: {
  methods: PayoutMethod[]
  isLoading: boolean
}) {
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader title="Wallets and payout methods" as="h3" />
      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading payout methods...</p>
      ) : methods.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No payout methods saved yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {methods.map((method) => (
            <li key={method.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-fg">{method.label}</p>
                <p className="text-caption text-fg-subtle">
                  {methodLabel(method.type as WithdrawalMethod)} - {method.maskedDetails}
                </p>
              </div>
              <p className="text-caption text-fg-muted">
                {method.isDefault ? 'Default' : method.isVerified ? 'Verified' : 'Saved'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function WithdrawalHistory({
  rows,
  isLoading,
}: {
  rows: Withdrawal[]
  isLoading: boolean
}) {
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader title="Withdrawal history" as="h3" description="API-backed payout requests." />
      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading withdrawals...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No withdrawals yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-fg">{row.reference || row.id}</p>
                <p className="text-caption text-fg-subtle">
                  {row.destinationLabel} - {formatDateTime(row.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money value={row.amount} className="text-body-sm font-medium" />
                <StatusPill status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function WithdrawWorkspace() {
  const { session } = useSession()
  const enabled = Boolean(session)
  const { data: limits } = useWithdrawalLimits({ enabled })
  const { data: payoutMethods, isLoading: methodsLoading } = usePayoutMethods({ enabled })
  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useWithdrawals(undefined, {
    enabled,
  })
  const createPayoutMethod = useCreatePayoutMethod()
  const requestOtp = useRequestWithdrawalOtp()
  const createWithdrawal = useCreateWithdrawal()

  const methods = payoutMethods ?? []
  const withdrawals = withdrawalsData?.items ?? []
  const available = toNumber(limits?.availableBalance)
  const pendingWithdrawal = useMemo(
    () =>
      withdrawals
        .filter((withdrawal) => PENDING_STATUSES.has(withdrawal.status))
        .reduce((sum, withdrawal) => sum + toNumber(withdrawal.amount), 0),
    [withdrawals],
  )

  const [amount, setAmount] = useState('')
  const [methodSource, setMethodSource] = useState<'existing' | 'new'>('new')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [methodType, setMethodType] = useState<WithdrawalMethod>('BANK_TRANSFER')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [otp, setOtp] = useState('')
  const [otpMethodId, setOtpMethodId] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)

  const crypto = cryptoDefaults(methodType)
  const isCrypto = Boolean(crypto.coin)
  const isSubmitting =
    createPayoutMethod.isPending || requestOtp.isPending || createWithdrawal.isPending

  async function ensurePayoutMethod() {
    if (methodSource === 'existing') {
      if (!selectedMethodId) throw new Error('Select a payout method.')
      return selectedMethodId
    }

    if (methodType === 'BANK_TRANSFER') {
      if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
        throw new Error('Complete all bank account fields.')
      }
      if (accountNumber !== confirmAccountNumber) {
        throw new Error('Account numbers do not match.')
      }
      const created = await createPayoutMethod.mutateAsync({
        label: `${bankName} ${accountNumber.slice(-4)}`,
        type: methodType,
        details: { accountHolderName, bankName, accountNumber, ifscCode },
        isDefault: methods.length === 0,
      })
      return created.id
    }

    if (methodType === 'UPI') {
      if (!upiId) throw new Error('Enter a UPI ID.')
      const created = await createPayoutMethod.mutateAsync({
        label: `UPI ${upiId}`,
        type: methodType,
        details: { upiId },
        isDefault: methods.length === 0,
      })
      return created.id
    }

    if (!walletAddress) throw new Error('Enter a wallet address.')
    const created = await createPayoutMethod.mutateAsync({
      label: `${crypto.coin} ${crypto.network}`,
      type: methodType,
      details: { coin: crypto.coin, network: crypto.network, address: walletAddress },
      isDefault: methods.length === 0,
    })
    return created.id
  }

  async function requestWithdrawalOtp(e: React.FormEvent) {
    e.preventDefault()
    const amountNumber = toNumber(amount)
    if (amountNumber <= 0) {
      toast.error('Enter a valid withdrawal amount.')
      return
    }
    if (amountNumber > available) {
      toast.error('Amount exceeds available balance.')
      return
    }
    if (limits && amountNumber > toNumber(limits.dailyRemaining)) {
      toast.error('Amount exceeds your remaining daily withdrawal limit.')
      return
    }

    try {
      const payoutMethodId = await ensurePayoutMethod()
      await requestOtp.mutateAsync({ amount, payoutMethodId })
      setOtpMethodId(payoutMethodId)
      setOtpRequested(true)
      toast.success('OTP sent', 'Check your registered email before submitting.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault()
    if (!otpMethodId) {
      toast.error('Request OTP before creating the withdrawal.')
      return
    }
    try {
      await createWithdrawal.mutateAsync({ amount, payoutMethodId: otpMethodId, otp })
      toast.success('Withdrawal requested', 'Status is Pending Review.')
      setAmount('')
      setOtp('')
      setOtpMethodId('')
      setOtpRequested(false)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Withdraw"
        description="Create a payout method, verify by email OTP, and submit for finance review."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Available Balance"
          icon={Wallet}
          value={<Money value={limits?.availableBalance ?? ('0.00' as MoneyString)} />}
          hint="Maximum amount available for a new request."
        />
        <StatCard
          label="Locked Balance"
          icon={ShieldCheck}
          value={<Money value={limits?.lockedBalance ?? ('0.00' as MoneyString)} />}
        />
        <StatCard
          label="Pending Withdrawal"
          icon={Building2}
          value={<Money value={money(pendingWithdrawal)} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="Withdrawal request"
            description={`Min $${limits?.min ?? '0.00'} - Daily remaining $${limits?.dailyRemaining ?? '0.00'}`}
          />
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => void (otpRequested ? submitWithdrawal(e) : requestWithdrawalOtp(e))}
          >
            <FormField
              label="Amount (USD)"
              required
              hint={`Available $${limits?.availableBalance ?? '0.00'}`}
              className="sm:col-span-2"
            >
              <Input
                numeric
                prefix="$"
                inputMode="decimal"
                value={amount}
                max={limits?.availableBalance}
                disabled={otpRequested}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>

            <FormField label="Payout method source" required>
              <Select
                value={methodSource}
                disabled={otpRequested}
                onValueChange={(value) => setMethodSource(value as 'existing' | 'new')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create from form</SelectItem>
                  <SelectItem value="existing">Use saved method</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {methodSource === 'existing' ? (
              <FormField label="Saved payout method" required>
                <Select
                  value={selectedMethodId}
                  disabled={otpRequested}
                  onValueChange={setSelectedMethodId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label} - {method.maskedDetails}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <FormField label="Method" required>
                <Select
                  value={methodType}
                  disabled={otpRequested}
                  onValueChange={(value) => setMethodType(value as WithdrawalMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {methodSource === 'new' && methodType === 'BANK_TRANSFER' ? (
              <>
                <FormField label="Account holder name" required>
                  <Input
                    value={accountHolderName}
                    disabled={otpRequested}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                  />
                </FormField>
                <FormField label="Bank name" required>
                  <Input
                    value={bankName}
                    disabled={otpRequested}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </FormField>
                <FormField label="Account #" required>
                  <Input
                    value={accountNumber}
                    disabled={otpRequested}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </FormField>
                <FormField label="Confirm account #" required>
                  <Input
                    value={confirmAccountNumber}
                    disabled={otpRequested}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  />
                </FormField>
                <FormField label="IFSC" required>
                  <Input
                    value={ifscCode}
                    disabled={otpRequested}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  />
                </FormField>
              </>
            ) : null}

            {methodSource === 'new' && methodType === 'UPI' ? (
              <FormField label="UPI ID" required>
                <Input
                  value={upiId}
                  disabled={otpRequested}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </FormField>
            ) : null}

            {methodSource === 'new' && isCrypto ? (
              <>
                <FormField label="Coin" required>
                  <Input value={crypto.coin} disabled readOnly />
                </FormField>
                <FormField label="Network" required>
                  <Input value={crypto.network} disabled readOnly />
                </FormField>
                <FormField label="Wallet address" required className="sm:col-span-2">
                  <Input
                    value={walletAddress}
                    disabled={otpRequested}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Paste destination wallet address"
                    className="font-mono text-sm"
                  />
                </FormField>
              </>
            ) : null}

            {otpRequested ? (
              <FormField
                label="Email OTP"
                required
                hint="Enter the code sent to your registered email."
                className="sm:col-span-2"
              >
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </FormField>
            ) : null}

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button type="submit" loading={isSubmitting}>
                {otpRequested ? 'Create withdrawal' : 'Request OTP'}
              </Button>
              {otpRequested ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOtp('')
                    setOtpMethodId('')
                    setOtpRequested(false)
                  }}
                >
                  Edit details
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <PayoutMethodList methods={methods} isLoading={methodsLoading} />
      </div>

      <WithdrawalHistory rows={withdrawals} isLoading={withdrawalsLoading} />
    </div>
  )
}
