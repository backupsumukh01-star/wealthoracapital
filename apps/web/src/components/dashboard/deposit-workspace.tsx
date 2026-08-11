'use client'

/**
 * Production deposit flow — single compact stepped page.
 * All payment details come from GET /deposits/methods (no demo data).
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { API_ROUTES, type Deposit, type PaymentMethod } from '@meridian/shared'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Smartphone,
  Upload,
  Wallet,
} from 'lucide-react'

import { DepositProofViewer } from '@/components/common/deposit-proof-viewer'
import { DualMoney } from '@/components/common/dual-money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { RiskDisclosure } from '@/components/common/risk-disclosure'
import { QrFrame } from '@/components/dashboard/qr-frame'
import { StatusPill } from '@/components/dashboard/status-pill'
import { StatusTimeline } from '@/components/dashboard/status-timeline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  useCancelDeposit,
  useCreateDeposit,
  useCreateOxapayDeposit,
  useDepositMethods,
  useDeposits,
  useOxapayStatus,
  useUploadDepositProof,
} from '@/features/deposits/hooks'
import { ApiError } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

const TIMELINE = [
  { id: 'submit', label: 'Submitted', done: false, current: true },
  { id: 'review', label: 'Under review', done: false },
  { id: 'credit', label: 'Credited', done: false },
]

type Rail = 'CRYPTO' | 'BANK' | 'UPI'
type Step = 'method' | 'amount' | 'details' | 'summary' | 'done' | 'gateway'

type CryptoWalletOption = {
  id: string
  label: string
  coin: string
  network: string
  address: string
  memo: string | null
  instructions: string | null
  qrCodeUrl: string | null
}

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

function railOf(method?: PaymentMethod): Rail | null {
  if (!method) return null
  if (isCryptoType(method.type)) return 'CRYPTO'
  if (method.type === 'UPI' || Boolean(method.upi?.upiId)) return 'UPI'
  if (method.type === 'BANK_TRANSFER' || Boolean(method.bank?.accountNumber)) return 'BANK'
  return null
}

function pickMethods(methods: PaymentMethod[], rail: Rail) {
  return methods.filter((m) => railOf(m) === rail)
}

function cryptoWallets(method?: PaymentMethod): CryptoWalletOption[] {
  if (!method) return []
  const fromApi = (method.cryptoWallets ?? [])
    .filter((w) => w.isActive !== false)
    .map((w) => ({
      id: w.id,
      label: w.label,
      coin: w.coin,
      network: w.network,
      address: w.address,
      memo: w.memo,
      instructions: w.instructions,
      qrCodeUrl: w.qrCodeUrl,
    }))
  if (fromApi.length) return fromApi

  const address = method.accountDetails?.walletAddress ?? method.accountDetails?.address
  if (!address) return []
  return [
    {
      id: `${method.id}:fallback`,
      label: method.name,
      coin: method.accountDetails?.coin ?? (method.type.includes('USDT') ? 'USDT' : method.type),
      network:
        method.accountDetails?.network ??
        method.network ??
        (method.type.includes('TRC20') ? 'TRC20' : method.type.includes('BEP20') ? 'BEP20' : '—'),
      address,
      memo: method.accountDetails?.memo ?? null,
      instructions: method.instructions || null,
      qrCodeUrl: method.accountDetails?.qrCodeUrl ?? null,
    },
  ]
}

function cleanDetails(details: Record<string, string | undefined | null>) {
  return Object.fromEntries(
    Object.entries(details)
      .map(([k, v]) => [k, (v ?? '').trim()] as const)
      .filter(([, v]) => v.length > 0),
  )
}

function parseAmount(raw: string) {
  const n = Number(raw.trim())
  return Number.isFinite(n) ? n : NaN
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="border-line/60 flex items-start justify-between gap-3 border-b py-2.5 last:border-0">
      <span className="text-caption text-fg-subtle">{label}</span>
      <span className="text-body-sm text-fg flex min-w-0 items-center gap-1.5 text-right">
        <span className="break-all font-medium tabular-nums">{value}</span>
        <CopyButton value={value} label={label} />
      </span>
    </div>
  )
}

function ProofPreview({ file }: { file: File | null }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  if (!file) return null
  return (
    <div className="border-line/60 bg-inset/40 mt-3 overflow-hidden rounded-xl border">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Payment proof preview" className="max-h-64 w-full object-contain" />
      ) : (
        <p className="text-body-sm text-fg-muted p-4">{file.name}</p>
      )}
      <p className="text-caption text-fg-subtle border-line/50 border-t px-3 py-2">{file.name}</p>
    </div>
  )
}

function DepositHistory() {
  const { session } = useSession()
  const { data, isLoading } = useDeposits(undefined, { enabled: Boolean(session) })
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = data?.items ?? []
  const openRow = rows.find((r) => r.id === openId) ?? null

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader title="Deposit history" description="API-backed requests only." as="h3" />
      {isLoading ? (
        <p className="text-body-sm text-fg-subtle mt-4">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-fg-subtle mt-4">No deposits yet.</p>
      ) : (
        <ul className="divide-line/70 mt-4 divide-y">
          {rows.map((row) => (
            <li key={row.id} className="space-y-3 py-3.5 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm text-fg font-medium">{row.reference || row.id}</p>
                  <p className="text-caption text-fg-subtle">
                    {row.method?.name ?? 'Deposit'} · {formatDateTime(row.createdAt)}
                    {row.hasProof ? ' · Proof on file' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <DualMoney
                    usd={row.amount}
                    inr={row.amountInr ?? row.depositInr}
                    className="text-body-sm font-medium"
                  />
                  <StatusPill status={row.status} />
                  {row.hasProof || row.proofImageUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    >
                      {openId === row.id ? 'Hide proof' : 'View proof'}
                    </Button>
                  ) : null}
                </div>
              </div>
              {openRow?.id === row.id ? (
                <DepositProofViewer
                  proofUrl={row.proofImageUrl ?? row.proofUrl ?? API_ROUTES.deposits.proofFile(row.id)}
                  hasProof={row.hasProof}
                  compact
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function DepositFlow({ methods }: { methods: PaymentMethod[] }) {
  const createDeposit = useCreateDeposit()
  const createOxapay = useCreateOxapayDeposit()
  const uploadProof = useUploadDepositProof()
  const cancelDeposit = useCancelDeposit()
  const { data: oxapayStatus } = useOxapayStatus()
  const oxapayEnabled = Boolean(oxapayStatus?.enabled)

  const [step, setStep] = useState<Step>('method')
  const [rail, setRail] = useState<Rail | null>(null)
  const [methodId, setMethodId] = useState<string | null>(null)
  const [depositUsd, setDepositUsd] = useState('')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [txHash, setTxHash] = useState('')
  const [utr, setUtr] = useState('')
  const [notes, setNotes] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<Deposit | null>(null)

  const amount = depositUsd

  const railMethods = useMemo(
    () => (rail ? pickMethods(methods, rail) : []),
    [methods, rail],
  )

  const selected = useMemo(
    () =>
      railMethods.find((m) => m.id === methodId) ??
      railMethods[0] ??
      null,
    [railMethods, methodId],
  )

  const wallets = useMemo(() => cryptoWallets(selected ?? undefined), [selected])
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? wallets[0] ?? null

  useEffect(() => {
    if (!selected) return
    setMethodId(selected.id)
    setWalletId(null)
    setTxHash('')
    setUtr('')
    setProof(null)
  }, [selected?.id])

  const railsAvailable = useMemo(() => {
    return {
      CRYPTO: pickMethods(methods, 'CRYPTO').length > 0,
      BANK: pickMethods(methods, 'BANK').length > 0,
      UPI: pickMethods(methods, 'UPI').length > 0,
    }
  }, [methods])

  const min = Number(selected?.minAmount ?? '1')
  const max = selected?.maxAmount ? Number(selected.maxAmount) : null
  const amountNum = parseAmount(amount)
  const amountError = (() => {
    if (!amount.trim()) return 'Enter a deposit amount.'
    if (!Number.isFinite(amountNum) || amountNum <= 0) return 'Amount must be a positive number.'
    if (amountNum < min) return `Minimum deposit is $${Number(selected?.minAmount ?? min).toFixed(2)}.`
    if (max != null && amountNum > max) return `Maximum deposit is $${Number(selected?.maxAmount).toFixed(2)}.`
    return null
  })()

  function onAmountChange(raw: string) {
    setDepositUsd(raw.replace(/[^\d.]/g, ''))
  }

  function chooseRail(next: Rail) {
    setRail(next)
    const list = pickMethods(methods, next)
    setMethodId(list[0]?.id ?? null)
    setDepositUsd('')
    setStep('amount')
  }

  function goDetails() {
    if (amountError) {
      toast.error(amountError)
      return
    }
    setStep('details')
  }

  async function startOxapayCheckout() {
    if (!selected || rail !== 'CRYPTO') return
    if (amountError) {
      toast.error(amountError)
      return
    }
    setSubmitting(true)
    try {
      const deposit = await createOxapay.mutateAsync({
        amount: depositUsd.trim(),
        methodId: selected.id,
        notes: notes.trim() || undefined,
      })
      const paymentUrl = deposit.paymentUrl
      if (!paymentUrl) {
        throw new Error('Checkout URL was not returned. Please try again.')
      }
      setSubmitted(deposit)
      setStep('gateway')
      toast.success('Checkout ready', 'Complete payment in the OxaPay window.')
      window.location.assign(paymentUrl)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not start crypto checkout.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function goSummary() {
    if (!selected || !rail) return
    if (rail === 'CRYPTO') {
      if (!selectedWallet) {
        toast.error('No crypto wallet is configured for this method.')
        return
      }
      if (!txHash.trim()) {
        toast.error('Transaction hash is required.')
        return
      }
    } else if (!utr.trim()) {
      toast.error(rail === 'UPI' ? 'UPI reference number is required.' : 'UTR / reference is required.')
      return
    }
    if (!proof) {
      toast.error('Payment screenshot is required.')
      return
    }
    setStep('summary')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selected || !rail || !proof) return
    if (amountError) {
      toast.error(amountError)
      return
    }

    const reference = rail === 'CRYPTO' ? txHash.trim() : utr.trim()
    setSubmitting(true)
    try {
      const submissionDetails =
        rail === 'CRYPTO'
          ? cleanDetails({
              rail: 'CRYPTO',
              methodName: selected.name,
              methodType: selected.type,
              coin: selectedWallet?.coin,
              network: selectedWallet?.network,
              walletAddress: selectedWallet?.address,
              walletId: selectedWallet?.id,
              memo: selectedWallet?.memo,
              txHash: reference,
              qrCodeUrl: selectedWallet?.qrCodeUrl,
              proofFileName: proof.name,
            })
          : rail === 'BANK'
            ? cleanDetails({
                rail: 'BANK',
                methodName: selected.name,
                methodType: selected.type,
                bankName: selected.bank?.bankName,
                accountHolderName: selected.bank?.accountHolderName,
                accountNumber: selected.bank?.accountNumber,
                ifscCode: selected.bank?.ifscCode,
                branch: selected.bank?.branch,
                upiId: selected.upi?.upiId,
                qrCodeUrl: selected.bank?.qrCodeUrl ?? selected.upi?.qrCodeUrl,
                utr: reference,
                userReference: reference,
                proofFileName: proof.name,
              })
            : cleanDetails({
                rail: 'UPI',
                methodName: selected.name,
                methodType: selected.type,
                upiId: selected.upi?.upiId,
                accountHolderName: selected.upi?.accountHolderName,
                qrCodeUrl: selected.upi?.qrCodeUrl,
                utr: reference,
                userReference: reference,
                proofFileName: proof.name,
              })

      const deposit = await createDeposit.mutateAsync({
        amount: depositUsd.trim(),
        methodId: selected.id,
        userReference: reference,
        txHash: rail === 'CRYPTO' ? reference : undefined,
        notes: notes.trim() || undefined,
        submissionDetails,
      })

      try {
        const withProof = await uploadProof.mutateAsync({ id: deposit.id, file: proof })
        if (!withProof.hasProof && !withProof.proofImageUrl) {
          throw new Error('Proof upload did not save. Please try again.')
        }
        setSubmitted(withProof)
        setStep('done')
        toast.success('Deposit submitted', 'Pending review — proof uploaded.')
      } catch (proofError) {
        try {
          await cancelDeposit.mutateAsync(deposit.id)
        } catch {
          // best-effort rollback so a proof-less request does not linger
        }
        throw proofError instanceof Error
          ? proofError
          : new Error('Proof upload failed. Deposit was not kept.')
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not submit deposit.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function resetFlow() {
    setStep('method')
    setRail(null)
    setMethodId(null)
    setDepositUsd('')
    setTxHash('')
    setUtr('')
    setNotes('')
    setProof(null)
    setSubmitted(null)
  }

  if (methods.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <p className="text-body-sm text-fg-subtle">
          No deposit methods are available. Contact support.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card variant="glass" className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            title="New deposit"
            description="Choose method → amount → transfer details → confirm."
            as="h3"
          />
          <p className="text-caption text-fg-subtle tabular-nums">
            {step === 'method'
              ? 'Step 1 · Method'
              : step === 'amount'
                ? 'Step 2 · Amount'
                : step === 'details'
                  ? 'Step 3 · Transfer'
                  : step === 'summary'
                    ? 'Step 4 · Confirm'
                    : step === 'gateway'
                      ? 'Checkout'
                      : 'Submitted'}
          </p>
        </div>

        {step !== 'method' && step !== 'done' && step !== 'gateway' ? (
          <button
            type="button"
            className="text-caption text-fg-subtle mb-4 inline-flex items-center gap-1.5 hover:text-fg"
            onClick={() => {
              if (step === 'amount') setStep('method')
              else if (step === 'details') setStep('amount')
              else if (step === 'summary') setStep('details')
            }}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back
          </button>
        ) : null}

        {step === 'method' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {railsAvailable.CRYPTO ? (
              <button
                type="button"
                onClick={() => chooseRail('CRYPTO')}
                className="border-line/70 bg-inset/40 hover:border-accent/50 hover:bg-accent/5 flex flex-col gap-2 rounded-2xl border p-4 text-left transition"
              >
                <Wallet className="text-accent-300 size-5" aria-hidden />
                <span className="text-body-sm text-fg font-medium">USDT / Crypto</span>
                <span className="text-caption text-fg-subtle">TRC20, BEP20, BTC, ETH</span>
              </button>
            ) : null}
            {railsAvailable.BANK ? (
              <div className="border-line/70 bg-inset/40 flex flex-col gap-2 rounded-2xl border p-4 text-left opacity-80">
                <Building2 className="text-accent-300 size-5" aria-hidden />
                <span className="text-body-sm text-fg font-medium">INR Bank</span>
                <span className="text-caption text-warning">Coming Soon</span>
              </div>
            ) : null}
            {railsAvailable.UPI ? (
              <div className="border-line/70 bg-inset/40 flex flex-col gap-2 rounded-2xl border p-4 text-left opacity-80">
                <Smartphone className="text-accent-300 size-5" aria-hidden />
                <span className="text-body-sm text-fg font-medium">UPI</span>
                <span className="text-caption text-warning">Coming Soon</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 'amount' && selected ? (
          <div className="mx-auto max-w-md space-y-4">
            {railMethods.length > 1 ? (
              <FormField label="Payment method" required>
                <Select value={selected.id} onValueChange={setMethodId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {railMethods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <p className="text-body-sm text-fg-muted">
                Method: <span className="text-fg font-medium">{selected.name}</span>
              </p>
            )}
            <FormField
              label="Investment amount (USDT)"
              required
              hint={`Minimum $${Number(selected.minAmount).toFixed(2)}${selected.maxAmount ? ` · Maximum $${Number(selected.maxAmount).toFixed(2)}` : ''}`}
              error={amount.trim() ? amountError ?? undefined : undefined}
            >
              <Input
                prefix="USDT"
                inputMode="decimal"
                value={depositUsd}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="Enter USDT amount"
                autoFocus
              />
            </FormField>
            {rail === 'CRYPTO' && oxapayEnabled ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void startOxapayCheckout()}
                  disabled={Boolean(amountError) || submitting}
                >
                  {submitting ? 'Opening checkout…' : 'Pay with crypto checkout'}
                  <ArrowRight aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={goDetails}
                  disabled={Boolean(amountError) || submitting}
                >
                  Manual transfer instead
                </Button>
                <p className="text-caption text-fg-subtle text-center">
                  After checkout, payment is verified then reviewed by Admin before your balance
                  updates. Manual transfer still requires proof and admin review.
                </p>
              </div>
            ) : (
              <Button type="button" className="w-full" onClick={goDetails} disabled={Boolean(amountError)}>
                Continue
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        ) : null}

        {step === 'gateway' && submitted ? (
          <div className="mx-auto max-w-md space-y-4 text-center">
            <CheckCircle2 className="text-accent-300 mx-auto size-10" aria-hidden />
            <SectionHeader
              title="Complete payment in OxaPay"
              description="Payment received goes under Admin review. Your available balance updates only after approval — not from this browser return."
              as="h3"
            />
            <p className="text-caption text-fg-subtle">
              Reference {submitted.reference}
              {submitted.oxapayTrackId ? ` · Track ${submitted.oxapayTrackId}` : ''}
            </p>
            {submitted.paymentUrl ? (
              <Button type="button" className="w-full" asChild>
                <a href={submitted.paymentUrl}>Open checkout again</a>
              </Button>
            ) : null}
            <Button type="button" variant="secondary" className="w-full" onClick={resetFlow}>
              Start another deposit
            </Button>
          </div>
        ) : null}

        {step === 'details' && selected && rail ? (
          <div className="space-y-5">
            {rail === 'CRYPTO' ? (
              <div className="space-y-4">
                {wallets.length > 1 ? (
                  <FormField label="Coin / network" required>
                    <Select
                      value={selectedWallet?.id}
                      onValueChange={setWalletId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coin and network" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.coin} · {w.network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : null}
                {selectedWallet ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div className="border-line/60 bg-inset/40 rounded-xl border px-3">
                      <DetailRow label="Coin" value={selectedWallet.coin} />
                      <DetailRow label="Network" value={selectedWallet.network} />
                      <DetailRow label="Wallet address" value={selectedWallet.address} />
                      <DetailRow label="Memo" value={selectedWallet.memo} />
                    </div>
                    {selectedWallet.qrCodeUrl ? (
                      <QrFrame
                        src={selectedWallet.qrCodeUrl}
                        label={`${selectedWallet.coin} QR`}
                        className="lg:w-52"
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-body-sm text-danger">No wallet configured for this method.</p>
                )}
                <div className="border-warning/30 bg-warning/10 text-caption text-warning flex gap-2 rounded-xl border p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>
                    Send only {selectedWallet?.coin ?? 'the selected coin'} on{' '}
                    {selectedWallet?.network ?? 'the selected network'}. Wrong-network transfers may
                    be unrecoverable.
                  </p>
                </div>
                {(selectedWallet?.instructions || selected.instructions) && (
                  <p className="text-caption text-fg-subtle">
                    {selectedWallet?.instructions || selected.instructions}
                  </p>
                )}
                <FormField label="Transaction hash" required>
                  <Input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste blockchain transaction hash"
                    className="font-mono text-sm"
                  />
                </FormField>
              </div>
            ) : null}

            {rail === 'BANK' ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="border-line/60 bg-inset/40 rounded-xl border px-3">
                    <DetailRow label="Bank name" value={selected.bank?.bankName} />
                    <DetailRow label="Account name" value={selected.bank?.accountHolderName} />
                    <DetailRow label="Account number" value={selected.bank?.accountNumber} />
                    <DetailRow label="IFSC" value={selected.bank?.ifscCode} />
                    <DetailRow label="Branch" value={selected.bank?.branch} />
                    <DetailRow label="UPI ID" value={selected.upi?.upiId} />
                  </div>
                  {(selected.bank?.qrCodeUrl || selected.upi?.qrCodeUrl) && (
                    <QrFrame
                      src={(selected.bank?.qrCodeUrl || selected.upi?.qrCodeUrl)!}
                      label="Bank QR"
                      className="lg:w-52"
                    />
                  )}
                </div>
                {selected.instructions ? (
                  <p className="text-caption text-fg-subtle">{selected.instructions}</p>
                ) : null}
                <FormField label="Reference number / UTR" required>
                  <Input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="IMPS / NEFT / RTGS UTR"
                  />
                </FormField>
              </div>
            ) : null}

            {rail === 'UPI' ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="border-line/60 bg-inset/40 rounded-xl border px-3">
                    <DetailRow label="UPI ID" value={selected.upi?.upiId} />
                    <DetailRow label="Account holder" value={selected.upi?.accountHolderName} />
                  </div>
                  {selected.upi?.qrCodeUrl ? (
                    <QrFrame src={selected.upi.qrCodeUrl} label="UPI QR" className="lg:w-52" />
                  ) : null}
                </div>
                {selected.instructions ? (
                  <p className="text-caption text-fg-subtle">{selected.instructions}</p>
                ) : null}
                <FormField label="UPI reference number" required>
                  <Input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="UPI transaction / reference ID"
                  />
                </FormField>
              </div>
            ) : null}

            <FormField label="Payment screenshot" required hint="JPG, PNG, WebP or PDF — required.">
              <div>
                <FileDropzone
                  onFileSelect={(file) => setProof(file)}
                  onFileClear={() => setProof(null)}
                />
                <ProofPreview file={proof} />
              </div>
            </FormField>

            <FormField label="Notes (optional)">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything that helps operations verify this deposit"
              />
            </FormField>

            <Button type="button" className="w-full sm:w-auto" onClick={goSummary}>
              Review summary
              <ArrowRight aria-hidden />
            </Button>
          </div>
        ) : null}

        {step === 'summary' && selected && rail ? (
          <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
            <div className="border-line/60 bg-inset/40 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
              <div>
                <p className="text-caption text-fg-subtle">Amount</p>
                <p className="text-heading-sm text-fg tabular-nums">{depositUsd} USDT</p>
              </div>
              <div>
                <p className="text-caption text-fg-subtle">Method</p>
                <p className="text-body-sm text-fg font-medium">{selected.name}</p>
              </div>
              {rail === 'CRYPTO' ? (
                <>
                  <div>
                    <p className="text-caption text-fg-subtle">Coin</p>
                    <p className="text-body-sm text-fg">{selectedWallet?.coin ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-caption text-fg-subtle">Network</p>
                    <p className="text-body-sm text-fg">{selectedWallet?.network ?? '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-caption text-fg-subtle">Transaction hash</p>
                    <p className="text-body-sm text-fg break-all font-mono">{txHash}</p>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <p className="text-caption text-fg-subtle">
                    {rail === 'UPI' ? 'UPI reference' : 'UTR / reference'}
                  </p>
                  <p className="text-body-sm text-fg break-all font-mono">{utr}</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <p className="text-caption text-fg-subtle">Uploaded proof</p>
                <p className="text-body-sm text-fg">{proof?.name ?? '—'}</p>
              </div>
            </div>
            <ProofPreview file={proof} />
            <Button type="submit" className="w-full sm:w-auto" loading={submitting}>
              <Upload aria-hidden />
              Submit deposit request
            </Button>
          </form>
        ) : null}

        {step === 'done' && submitted ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="text-success mx-auto size-10" aria-hidden />
            <div>
              <p className="text-heading-sm text-fg">Pending review</p>
              <p className="text-body-sm text-fg-muted mt-1">
                {submitted.reference} · {submitted.amount} USDT
                {submitted.hasProof ? ' · Proof uploaded' : ''}
              </p>
            </div>
            {(submitted.proofImageUrl || submitted.proofUrl || submitted.hasProof) && (
              <DepositProofViewer
                proofUrl={
                  submitted.proofImageUrl ??
                  submitted.proofUrl ??
                  API_ROUTES.deposits.proofFile(submitted.id)
                }
                hasProof={submitted.hasProof}
                compact
              />
            )}
            <StatusTimeline steps={TIMELINE} activeIndex={1} />
            <Button type="button" variant="secondary" onClick={resetFlow}>
              Make another deposit
            </Button>
          </div>
        ) : null}
      </Card>

      <DepositHistory />
    </div>
  )
}

export function DepositWorkspace() {
  const { session } = useSession()
  const { data: methods, isLoading } = useDepositMethods({ enabled: Boolean(session) })

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Deposit"
        description="Fund your Growzy wallet with live payment methods — amount, reference, and proof required."
      />
      {isLoading ? (
        <Card variant="glass" className="p-6">
          <p className="text-body-sm text-fg-subtle">Loading deposit methods…</p>
        </Card>
      ) : (
        <DepositFlow methods={methods ?? []} />
      )}
      <RiskDisclosure />
    </div>
  )
}
