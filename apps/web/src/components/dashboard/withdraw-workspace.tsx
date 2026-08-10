'use client'

/**
 * Production withdrawal flow — always starts on Withdrawal Home.
 * Add Wallet opens only when zero crypto wallets exist or user taps "Add New Wallet".
 */

import { useMemo, useState } from 'react'
import type { MoneyString, PaymentMethodType, PayoutMethod, Withdrawal } from '@meridian/shared'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react'

import { DualMoney } from '@/components/common/dual-money'
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
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

type Rail = 'CRYPTO' | 'BANK' | 'UPI'
type Step = 'home' | 'destination' | 'add-wallet' | 'add-bank' | 'add-upi' | 'review' | 'otp' | 'done'

type CryptoType = Extract<PaymentMethodType, 'USDT_TRC20' | 'USDT_BEP20' | 'BTC' | 'ETH'>

const PENDING_STATUSES = new Set(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'])

const CRYPTO_NETWORKS: Array<{ type: CryptoType; coin: string; network: string; label: string }> = [
  { type: 'USDT_TRC20', coin: 'USDT', network: 'TRC20', label: 'USDT · TRC20' },
  { type: 'USDT_BEP20', coin: 'USDT', network: 'BEP20', label: 'USDT · BEP20' },
  { type: 'BTC', coin: 'BTC', network: 'BTC', label: 'BTC' },
  { type: 'ETH', coin: 'ETH', network: 'ETH', label: 'ETH' },
]

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

function toNumber(value: string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: number): MoneyString {
  return value.toFixed(2) as MoneyString
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.'
}

function cryptoMeta(type: string) {
  return CRYPTO_NETWORKS.find((item) => item.type === type) ?? {
    type: 'USDT_TRC20' as CryptoType,
    coin: 'USDT',
    network: 'TRC20',
    label: 'USDT · TRC20',
  }
}

function filterMethods(methods: PayoutMethod[], rail: Rail) {
  if (rail === 'CRYPTO') return methods.filter((m) => isCryptoType(m.type))
  if (rail === 'BANK') return methods.filter((m) => m.type === 'BANK_TRANSFER')
  return methods.filter((m) => m.type === 'UPI')
}

function WithdrawalHistory({ rows, isLoading }: { rows: Withdrawal[]; isLoading: boolean }) {
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader title="Withdrawal history" as="h3" description="API-backed payout requests." />
      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading withdrawals…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No withdrawals yet.</p>
      ) : (
        <ul className="divide-line/70 mt-4 divide-y">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-body-sm text-fg font-medium">{row.reference || row.id}</p>
                <p className="text-caption text-fg-subtle">
                  {row.destinationLabel} · {formatDateTime(row.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <DualMoney
                  usd={row.amount}
                  inr={row.amountInr ?? row.withdrawInr}
                  className="text-body-sm font-medium"
                />
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
  const { rate, usdToInr, inrToUsd } = useExchangeRate()

  const methods = payoutMethods ?? []
  const withdrawals = withdrawalsData?.items ?? []
  const available = toNumber(limits?.availableBalance)
  const pendingWithdrawal = useMemo(
    () =>
      withdrawals
        .filter((w) => PENDING_STATUSES.has(w.status))
        .reduce((sum, w) => sum + toNumber(w.amount), 0),
    [withdrawals],
  )

  const [step, setStep] = useState<Step>('home')
  const [rail, setRail] = useState<Rail | null>(null)
  const [withdrawUsd, setWithdrawUsd] = useState('')
  const [withdrawInr, setWithdrawInr] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpExpiresHint, setOtpExpiresHint] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Withdrawal | null>(null)

  const amount = withdrawUsd

  // Add wallet form
  const [newCryptoType, setNewCryptoType] = useState<CryptoType>('USDT_TRC20')
  const [newAddress, setNewAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')

  // Add bank form
  const [accountHolderName, setAccountHolderName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')

  // Add UPI form
  const [upiId, setUpiId] = useState('')

  const [busy, setBusy] = useState(false)

  const amountNum = toNumber(amount)
  const amountError = (() => {
    if (!amount.trim()) return 'Enter a withdrawal amount.'
    if (!(amountNum > 0)) return 'Amount must be a positive number.'
    if (amountNum > available) return 'Amount cannot exceed available balance.'
    if (limits?.min && amountNum < toNumber(limits.min)) {
      return `Minimum withdrawal is $${limits.min}.`
    }
    if (limits?.dailyRemaining && amountNum > toNumber(limits.dailyRemaining)) {
      return 'Amount exceeds remaining daily limit.'
    }
    return null
  })()

  function onUsdChange(raw: string) {
    const next = raw.replace(/[^\d.]/g, '')
    setWithdrawUsd(next)
    setWithdrawInr(next ? usdToInr(next) : '')
  }

  function onInrChange(raw: string) {
    const next = raw.replace(/[^\d]/g, '')
    setWithdrawInr(next)
    setWithdrawUsd(next ? inrToUsd(next) : '')
  }

  const railMethods = rail ? filterMethods(methods, rail) : []
  const selectedMethod =
    railMethods.find((m) => m.id === selectedMethodId) ?? railMethods[0] ?? null

  function goHome() {
    setStep('home')
    setRail(null)
    setSelectedMethodId(null)
    setOtp('')
    setOtpExpiresHint(null)
  }

  function continueFromHome() {
    if (!rail) {
      toast.error('Select a withdrawal method.')
      return
    }
    if (amountError) {
      toast.error(amountError)
      return
    }

    const existing = filterMethods(methods, rail)
    if (rail === 'CRYPTO') {
      if (existing.length === 0) {
        // Only auto-open Add Wallet when the user has zero saved crypto wallets.
        setStep('add-wallet')
        return
      }
      setSelectedMethodId(existing.find((m) => m.isDefault)?.id ?? existing[0]?.id ?? null)
      setStep('destination')
      return
    }

    if (rail === 'BANK') {
      if (existing.length === 0) {
        setStep('add-bank')
        return
      }
      setSelectedMethodId(existing.find((m) => m.isDefault)?.id ?? existing[0]?.id ?? null)
      setStep('destination')
      return
    }

    // UPI
    if (existing.length === 0) {
      setStep('add-upi')
      return
    }
    setSelectedMethodId(existing.find((m) => m.isDefault)?.id ?? existing[0]?.id ?? null)
    setStep('destination')
  }

  function goReview() {
    if (!selectedMethod) {
      toast.error('Select a destination first.')
      return
    }
    setSelectedMethodId(selectedMethod.id)
    setStep('review')
  }

  async function saveCryptoWallet() {
    if (!newAddress.trim()) {
      toast.error('Wallet address is required.')
      return
    }
    const meta = cryptoMeta(newCryptoType)
    setBusy(true)
    try {
      const created = await createPayoutMethod.mutateAsync({
        label: newLabel.trim() || `${meta.coin} ${meta.network}`,
        type: newCryptoType,
        details: {
          coin: meta.coin,
          network: meta.network,
          address: newAddress.trim(),
        },
        isDefault: filterMethods(methods, 'CRYPTO').length === 0,
      })
      setSelectedMethodId(created.id)
      setNewAddress('')
      setNewLabel('')
      setStep('review')
      toast.success('Wallet saved')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function saveBank() {
    if (!accountHolderName.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast.error('Complete all bank fields.')
      return
    }
    if (accountNumber !== confirmAccountNumber) {
      toast.error('Account numbers do not match.')
      return
    }
    setBusy(true)
    try {
      const created = await createPayoutMethod.mutateAsync({
        label: `${bankName.trim()} ${accountNumber.trim().slice(-4)}`,
        type: 'BANK_TRANSFER',
        details: {
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
        },
        isDefault: filterMethods(methods, 'BANK').length === 0,
      })
      setSelectedMethodId(created.id)
      setStep('review')
      toast.success('Bank account saved')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function saveUpi() {
    if (!upiId.trim()) {
      toast.error('UPI ID is required.')
      return
    }
    setBusy(true)
    try {
      const created = await createPayoutMethod.mutateAsync({
        label: `UPI ${upiId.trim()}`,
        type: 'UPI',
        details: { upiId: upiId.trim() },
        isDefault: filterMethods(methods, 'UPI').length === 0,
      })
      setSelectedMethodId(created.id)
      setStep('review')
      toast.success('UPI saved')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function sendOtpAndContinue() {
    if (!selectedMethodId) {
      toast.error('Select a destination.')
      return
    }
    setBusy(true)
    try {
      const res = await requestOtp.mutateAsync({
        amount: amount.trim(),
        payoutMethodId: selectedMethodId,
      })
      setOtp('')
      setOtpExpiresHint(
        res.expiresAt
          ? `Expires ${formatDateTime(res.expiresAt)}`
          : res.message ?? 'Code expires in 10 minutes.',
      )
      setStep('otp')
      toast.success('OTP sent', 'Check your registered email.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtpAndCreate() {
    if (!selectedMethodId || !otp.trim()) {
      toast.error('Enter the OTP from your email.')
      return
    }
    setBusy(true)
    try {
      const withdrawal = await createWithdrawal.mutateAsync({
        amount: withdrawUsd.trim(),
        amountInr: withdrawInr.trim() || undefined,
        payoutMethodId: selectedMethodId,
        otp: otp.trim(),
      })
      setSubmitted(withdrawal)
      setStep('done')
      toast.success('Withdrawal submitted', 'Status: Pending Review')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function resetAll() {
    setWithdrawUsd('')
    setWithdrawInr('')
    setSubmitted(null)
    goHome()
  }

  const reviewMeta = selectedMethod ? cryptoMeta(selectedMethod.type) : null
  const stepLabel =
    step === 'home'
      ? 'Step 1 · Home'
      : step === 'destination' || step === 'add-wallet' || step === 'add-bank' || step === 'add-upi'
        ? 'Step 2 · Destination'
        : step === 'review'
          ? 'Step 3 · Review'
          : step === 'otp'
            ? 'Step 4 · OTP'
            : 'Submitted'

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Withdraw"
        description="Available balance, method, destination, review, then email OTP — request is created only after OTP verification."
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

      <Card variant="glass" className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Withdrawal" description="Start here every time." as="h3" />
          <p className="text-caption text-fg-subtle tabular-nums">{stepLabel}</p>
        </div>

        {step !== 'home' && step !== 'done' ? (
          <button
            type="button"
            className="text-caption text-fg-subtle mb-4 inline-flex items-center gap-1.5 hover:text-fg"
            onClick={() => {
              if (step === 'destination') setStep('home')
              else if (step === 'add-wallet' || step === 'add-bank' || step === 'add-upi') {
                // Prefer destination list when wallets already exist; otherwise home.
                if (rail && filterMethods(methods, rail).length > 0) setStep('destination')
                else setStep('home')
              } else if (step === 'review') {
                setStep(rail && filterMethods(methods, rail).length > 0 ? 'destination' : 'home')
              } else if (step === 'otp') setStep('review')
            }}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back
          </button>
        ) : null}

        {/* HOME — always first */}
        {step === 'home' ? (
          <div className="space-y-5">
            <div>
              <p className="text-body-sm text-fg mb-2 font-medium">Withdrawal method</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      id: 'CRYPTO' as const,
                      title: 'Crypto (USDT)',
                      desc: 'USDT, BTC, ETH',
                      icon: Wallet,
                      soon: false,
                    },
                    {
                      id: 'BANK' as const,
                      title: 'Bank (INR)',
                      desc: 'Coming Soon',
                      icon: Building2,
                      soon: true,
                    },
                    {
                      id: 'UPI' as const,
                      title: 'UPI (INR)',
                      desc: 'Coming Soon',
                      icon: Smartphone,
                      soon: true,
                    },
                  ] as const
                ).map((item) =>
                  item.soon ? (
                    <div
                      key={item.id}
                      className="border-line/70 bg-inset/40 flex flex-col gap-2 rounded-2xl border p-4 text-left opacity-80"
                    >
                      <item.icon className="text-accent-300 size-5" aria-hidden />
                      <span className="text-body-sm text-fg font-medium">{item.title}</span>
                      <span className="text-caption text-warning">{item.desc}</span>
                    </div>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRail(item.id)}
                      className={cn(
                        'border-line/70 bg-inset/40 flex flex-col gap-2 rounded-2xl border p-4 text-left transition',
                        rail === item.id
                          ? 'border-accent/60 bg-accent/10 ring-accent/30 ring-1'
                          : 'hover:border-accent/40',
                      )}
                    >
                      <item.icon className="text-accent-300 size-5" aria-hidden />
                      <span className="text-body-sm text-fg font-medium">{item.title}</span>
                      <span className="text-caption text-fg-subtle">{item.desc}</span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <FormField
              label="Amount (USD)"
              required
              hint={`Available $${limits?.availableBalance ?? '0.00'}${
                limits?.min ? ` · Min $${limits.min}` : ''
              } · Desk rate 1 USD = ₹${rate}`}
              error={amount.trim() ? amountError ?? undefined : undefined}
            >
              <Input
                prefix="$"
                inputMode="decimal"
                value={withdrawUsd}
                onChange={(e) => onUsdChange(e.target.value)}
                placeholder="Enter USD amount"
              />
            </FormField>
            <FormField
              label="Amount (INR)"
              hint="Synced live from the desk rate. Whole rupees only."
            >
              <Input
                prefix="₹"
                inputMode="numeric"
                value={withdrawInr}
                onChange={(e) => onInrChange(e.target.value)}
                placeholder="Enter INR amount"
              />
            </FormField>

            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!rail || Boolean(amountError)}
              onClick={continueFromHome}
            >
              Continue
              <ArrowRight aria-hidden />
            </Button>
          </div>
        ) : null}

        {/* DESTINATION — saved wallets/accounts list */}
        {step === 'destination' && rail ? (
          <div className="space-y-4">
            {methodsLoading ? (
              <p className="text-body-sm text-fg-subtle">Loading saved destinations…</p>
            ) : (
              <div className="space-y-2">
                {railMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={cn(
                      'border-line/70 w-full rounded-xl border px-4 py-3 text-left transition',
                      selectedMethodId === method.id
                        ? 'border-accent/60 bg-accent/10'
                        : 'bg-inset/40 hover:border-accent/40',
                    )}
                  >
                    <p className="text-body-sm text-fg font-medium">{method.label}</p>
                    <p className="text-caption text-fg-subtle">{method.maskedDetails}</p>
                  </button>
                ))}
              </div>
            )}

            {rail === 'CRYPTO' ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setStep('add-wallet')}
              >
                <Plus aria-hidden />
                Add New Wallet
              </Button>
            ) : null}
            {rail === 'BANK' ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setStep('add-bank')}
              >
                <Plus aria-hidden />
                Add bank account
              </Button>
            ) : null}
            {rail === 'UPI' ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setStep('add-upi')}
              >
                <Plus aria-hidden />
                Add UPI ID
              </Button>
            ) : null}

            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!selectedMethodId}
              onClick={goReview}
            >
              Continue to review
              <ArrowRight aria-hidden />
            </Button>
          </div>
        ) : null}

        {/* ADD WALLET — never auto unless zero wallets */}
        {step === 'add-wallet' ? (
          <div className="mx-auto max-w-md space-y-4">
            <p className="text-body-sm text-fg-muted">
              {filterMethods(methods, 'CRYPTO').length === 0
                ? 'No saved crypto wallets yet — add one to continue.'
                : 'Add a new destination wallet.'}
            </p>
            <FormField label="Coin / network" required>
              <Select
                value={newCryptoType}
                onValueChange={(v) => setNewCryptoType(v as CryptoType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_NETWORKS.map((item) => (
                    <SelectItem key={item.type} value={item.type}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Label (optional)">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Personal USDT"
              />
            </FormField>
            <FormField label="Wallet address" required>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="font-mono text-sm"
                placeholder="Paste address"
              />
            </FormField>
            <Button
              type="button"
              className="w-full"
              loading={busy}
              onClick={() => void saveCryptoWallet()}
            >
              Save wallet & continue
            </Button>
          </div>
        ) : null}

        {step === 'add-bank' ? (
          <div className="mx-auto max-w-md space-y-4">
            <FormField label="Account holder name" required>
              <Input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
            </FormField>
            <FormField label="Bank name" required>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </FormField>
            <FormField label="Account number" required>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </FormField>
            <FormField label="Confirm account number" required>
              <Input
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value)}
              />
            </FormField>
            <FormField label="IFSC" required>
              <Input
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              />
            </FormField>
            <Button type="button" className="w-full" loading={busy} onClick={() => void saveBank()}>
              Save bank & continue
            </Button>
          </div>
        ) : null}

        {step === 'add-upi' ? (
          <div className="mx-auto max-w-md space-y-4">
            <FormField label="UPI ID" required>
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@bank"
              />
            </FormField>
            <Button type="button" className="w-full" loading={busy} onClick={() => void saveUpi()}>
              Save UPI & continue
            </Button>
          </div>
        ) : null}

        {/* REVIEW */}
        {step === 'review' && selectedMethod ? (
          <div className="space-y-5">
            <div className="border-line/60 bg-inset/40 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
              <div>
                <p className="text-caption text-fg-subtle">Amount</p>
                <p className="text-heading-sm text-fg tabular-nums">
                  ${withdrawUsd}
                  {withdrawInr ? (
                    <span className="text-body-sm text-fg-subtle font-normal"> · ₹{withdrawInr}</span>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-caption text-fg-subtle">Method</p>
                <p className="text-body-sm text-fg font-medium">
                  {rail === 'CRYPTO' ? 'Crypto' : rail === 'BANK' ? 'Bank (INR)' : 'UPI (INR)'}
                </p>
              </div>
              {isCryptoType(selectedMethod.type) ? (
                <>
                  <div>
                    <p className="text-caption text-fg-subtle">Coin</p>
                    <p className="text-body-sm text-fg">{reviewMeta?.coin ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-caption text-fg-subtle">Network</p>
                    <p className="text-body-sm text-fg">{reviewMeta?.network ?? '—'}</p>
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <p className="text-caption text-fg-subtle">
                  {isCryptoType(selectedMethod.type) ? 'Wallet address' : 'Destination'}
                </p>
                <p className="text-body-sm text-fg break-all font-mono">
                  {selectedMethod.maskedDetails}
                </p>
                <p className="text-caption text-fg-muted mt-1">{selectedMethod.label}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-caption text-fg-subtle">Estimated processing time</p>
                <p className="text-body-sm text-fg">1–24 hours after admin approval</p>
              </div>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              loading={busy}
              onClick={() => void sendOtpAndContinue()}
            >
              Continue — send email OTP
              <ArrowRight aria-hidden />
            </Button>
          </div>
        ) : null}

        {/* OTP */}
        {step === 'otp' ? (
          <div className="mx-auto max-w-md space-y-4">
            <p className="text-body-sm text-fg-muted">
              Enter the code emailed to your registered address. The withdrawal is created only after
              OTP verification.
            </p>
            {otpExpiresHint ? (
              <p className="text-caption text-fg-subtle">{otpExpiresHint}</p>
            ) : null}
            <FormField label="Email OTP" required>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                autoFocus
              />
            </FormField>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                loading={busy}
                disabled={!otp.trim()}
                onClick={() => void verifyOtpAndCreate()}
              >
                Verify OTP & submit
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void sendOtpAndContinue()}
              >
                Resend OTP
              </Button>
            </div>
          </div>
        ) : null}

        {/* DONE */}
        {step === 'done' && submitted ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="text-success mx-auto size-10" aria-hidden />
            <div>
              <p className="text-heading-sm text-fg">Pending review</p>
              <p className="text-body-sm text-fg-muted mt-1">
                {submitted.reference} · ${submitted.amount}
                {submitted.amountInr || submitted.withdrawInr
                  ? ` · ₹${submitted.amountInr ?? submitted.withdrawInr}`
                  : ''}{' '}
                · {submitted.status}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={resetAll}>
              New withdrawal
            </Button>
          </div>
        ) : null}
      </Card>

      <WithdrawalHistory rows={withdrawals} isLoading={withdrawalsLoading} />
    </div>
  )
}
