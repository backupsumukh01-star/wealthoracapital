'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Deposit, PaymentMethod } from '@meridian/shared'
import { AlertTriangle, Upload } from 'lucide-react'

import { DepositMethodCard } from '@/components/deposits/deposit-method-card'
import { Money } from '@/components/common/money'
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
  useCreateDeposit,
  useDepositMethods,
  useDeposits,
  useUploadDepositProof,
} from '@/features/deposits/hooks'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

const DEPOSIT_TIMELINE_STEPS = [
  { id: 'submit', label: 'Submitted', done: false, current: true },
  { id: 'review', label: 'Under review', done: false },
  { id: 'credit', label: 'Credited', done: false },
]

type MethodKind = 'UPI' | 'BANK_TRANSFER' | 'CRYPTO' | 'OTHER'

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

function methodKind(method?: PaymentMethod): MethodKind {
  if (!method) return 'OTHER'
  if (isCryptoType(method.type)) return 'CRYPTO'
  if (method.type === 'UPI') return 'UPI'
  if (method.type === 'BANK_TRANSFER') return 'BANK_TRANSFER'
  return 'OTHER'
}

function timelineActiveIndex(status: Deposit['status'] | undefined) {
  if (!status) return 0
  if (status === 'APPROVED') return 2
  if (status === 'UNDER_REVIEW' || status === 'PENDING') return 1
  return 0
}

function cleanDetails(details: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(details)
      .map(([key, value]) => [key, value?.trim() ?? ''] as const)
      .filter(([, value]) => value.length > 0),
  )
}

function cryptoWalletOptions(method?: PaymentMethod): CryptoWalletOption[] {
  if (!method) return []
  const wallets = (method.cryptoWallets ?? [])
    .filter((wallet) => wallet.isActive !== false)
    .map((wallet) => ({
      id: wallet.id,
      label: wallet.label,
      coin: wallet.coin,
      network: wallet.network,
      address: wallet.address,
      memo: wallet.memo,
      instructions: wallet.instructions,
      qrCodeUrl: wallet.qrCodeUrl,
    }))

  if (wallets.length > 0) return wallets

  const address = method.accountDetails.walletAddress ?? method.accountDetails.address
  if (!address) return []

  return [
    {
      id: `${method.id}:fallback-wallet`,
      label: method.name,
      coin: method.accountDetails.coin ?? method.type.replace('USDT_', 'USDT '),
      network: method.accountDetails.network ?? method.network ?? method.type.replaceAll('_', ' '),
      address,
      memo: method.accountDetails.memo ?? null,
      instructions: method.instructions || null,
      qrCodeUrl: method.accountDetails.qrCodeUrl ?? null,
    },
  ]
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

function DepositHistory({ filter }: { filter?: (d: Deposit) => boolean }) {
  const { session } = useSession()
  const { data, isLoading } = useDeposits(undefined, { enabled: Boolean(session) })
  const rows = (data?.items ?? []).filter((d) => (filter ? filter(d) : true))
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        title="Deposit history"
        description="Recent requests and their review status."
        as="h3"
      />
      {isLoading ? (
        <p className="text-body-sm text-fg-subtle mt-4">Loading deposits...</p>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-fg-subtle mt-4">No deposits yet.</p>
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
                  {row.method?.name ?? 'Deposit'} · {formatDateTime(row.createdAt)}
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

function DepositFlow({ methods }: { methods: PaymentMethod[] }) {
  const { session } = useSession()
  const { data: depositsData } = useDeposits(undefined, { enabled: Boolean(session) })
  const createDeposit = useCreateDeposit()
  const uploadProof = useUploadDepositProof()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [amount, setAmount] = useState('500')
  const [upiIdUsed, setUpiIdUsed] = useState('')
  const [utr, setUtr] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderBank, setSenderBank] = useState('')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [txHash, setTxHash] = useState('')
  const [notes, setNotes] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedDeposit, setSubmittedDeposit] = useState<Deposit | null>(null)

  const selected = useMemo(
    () => methods.find((method) => method.id === (selectedId ?? methods[0]?.id)) ?? methods[0],
    [methods, selectedId],
  )
  const selectedKind = methodKind(selected)
  const wallets = useMemo(() => cryptoWalletOptions(selected), [selected])
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId) ?? wallets[0] ?? null

  useEffect(() => {
    setUpiIdUsed('')
    setUtr('')
    setSenderName('')
    setSenderBank('')
    setWalletId(null)
    setTxHash('')
    setNotes('')
    setProof(null)
  }, [selected?.id])

  const pending =
    (depositsData?.items ?? []).find(
      (deposit) => deposit.status === 'UNDER_REVIEW' || deposit.status === 'PENDING',
    ) ?? submittedDeposit

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selected) {
      toast.error('No deposit methods are configured. Contact support.')
      return
    }

    const reference = selectedKind === 'CRYPTO' ? txHash.trim() : utr.trim()
    if (!amount.trim() || Number(amount) <= 0) {
      toast.error('Enter a valid deposit amount.')
      return
    }
    if (!reference) {
      toast.error(
        selectedKind === 'CRYPTO'
          ? 'Enter the transaction hash.'
          : 'Enter the UTR/reference number.',
      )
      return
    }
    if (selectedKind === 'UPI' && !upiIdUsed.trim()) {
      toast.error('Enter the UPI ID used for payment.')
      return
    }
    if (selectedKind === 'BANK_TRANSFER' && (!senderName.trim() || !senderBank.trim())) {
      toast.error('Enter the sender name and bank.')
      return
    }
    if (selectedKind === 'CRYPTO' && !selectedWallet) {
      toast.error('Select a crypto wallet before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const submissionDetails =
        selectedKind === 'UPI'
          ? cleanDetails({
              upiIdUsed,
              utr,
              paymentMethod: selected.name,
              payeeUpiId: selected.upi?.upiId,
            })
          : selectedKind === 'BANK_TRANSFER'
            ? cleanDetails({
                senderName,
                senderBank,
                utr,
                paymentMethod: selected.name,
                beneficiaryBank: selected.bank?.bankName,
              })
            : cleanDetails({
                txHash,
                walletId: selectedWallet?.id,
                coin: selectedWallet?.coin,
                network: selectedWallet?.network,
                walletAddress: selectedWallet?.address,
              })

      const deposit = await createDeposit.mutateAsync({
        amount: amount.trim(),
        methodId: selected.id,
        userReference: reference,
        txHash: selectedKind === 'CRYPTO' ? reference : undefined,
        notes: notes.trim() || undefined,
        submissionDetails,
      })
      if (proof) {
        await uploadProof.mutateAsync({ id: deposit.id, file: proof })
      }
      setSubmittedDeposit(deposit)
      toast.success('Deposit submitted', 'Awaiting operations review.')
      setUpiIdUsed('')
      setUtr('')
      setSenderName('')
      setSenderBank('')
      setTxHash('')
      setNotes('')
      setProof(null)
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

  function renderSelectedDetails() {
    if (!selected) return null

    if (selectedKind === 'UPI') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="border-line/60 bg-inset/40 rounded-lg border px-3">
            <DetailRow label="UPI ID" value={selected.upi?.upiId} />
            <DetailRow label="Account holder" value={selected.upi?.accountHolderName} />
          </div>
          {selected.upi?.qrCodeUrl ? (
            <QrFrame
              src={selected.upi.qrCodeUrl}
              label={`${selected.name} QR`}
              className="lg:w-56"
            />
          ) : null}
        </div>
      )
    }

    if (selectedKind === 'BANK_TRANSFER') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="border-line/60 bg-inset/40 rounded-lg border px-3">
            <DetailRow label="Account holder" value={selected.bank?.accountHolderName} />
            <DetailRow label="Bank" value={selected.bank?.bankName} />
            <DetailRow label="Account number" value={selected.bank?.accountNumber} />
            <DetailRow label="IFSC" value={selected.bank?.ifscCode} />
            <DetailRow label="Branch" value={selected.bank?.branch} />
            <DetailRow label="Account type" value={selected.bank?.accountType} />
          </div>
          {selected.bank?.qrCodeUrl ? (
            <QrFrame
              src={selected.bank.qrCodeUrl}
              label={`${selected.name} QR`}
              className="lg:w-56"
            />
          ) : null}
        </div>
      )
    }

    if (selectedKind === 'CRYPTO') {
      return (
        <div className="space-y-4">
          {wallets.length > 1 ? (
            <FormField label="Coin / network" required>
              <Select value={selectedWallet?.id} onValueChange={setWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coin and network" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.coin} · {wallet.network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          {selectedWallet ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="border-line/60 bg-inset/40 rounded-lg border px-3">
                  <DetailRow label="Coin" value={selectedWallet.coin} />
                  <DetailRow label="Network" value={selectedWallet.network} />
                  <DetailRow label="Wallet address" value={selectedWallet.address} />
                  <DetailRow label="Memo / tag" value={selectedWallet.memo} />
                </div>
                <div className="border-warning/30 bg-warning/10 text-caption text-warning flex gap-2 rounded-lg border p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>
                    Send only {selectedWallet.coin} on {selectedWallet.network}. Transfers on the
                    wrong network may be unrecoverable.
                  </p>
                </div>
                {selectedWallet.instructions ? (
                  <p className="text-caption text-fg-subtle">{selectedWallet.instructions}</p>
                ) : null}
              </div>
              {selectedWallet.qrCodeUrl ? (
                <QrFrame
                  src={selectedWallet.qrCodeUrl}
                  label={`${selectedWallet.coin} ${selectedWallet.network} QR`}
                  className="lg:w-56"
                />
              ) : null}
            </div>
          ) : (
            <p className="border-line/60 bg-inset/40 text-body-sm text-fg-subtle rounded-lg border p-3">
              No wallet address is configured for this crypto method. Please contact support.
            </p>
          )}
        </div>
      )
    }

    return Object.keys(selected.accountDetails).length > 0 ? (
      <div className="border-line/60 bg-inset/40 rounded-lg border px-3">
        {Object.entries(selected.accountDetails).map(([key, value]) => (
          <DetailRow key={key} label={key.replaceAll('_', ' ')} value={value} />
        ))}
      </div>
    ) : null
  }

  function renderReferenceFields() {
    if (selectedKind === 'UPI') {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="UPI ID used" required>
            <Input
              value={upiIdUsed}
              onChange={(e) => setUpiIdUsed(e.target.value)}
              placeholder="name@bank"
            />
          </FormField>
          <FormField label="UTR / reference" required>
            <Input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="12-digit UTR or payment reference"
            />
          </FormField>
        </div>
      )
    }

    if (selectedKind === 'BANK_TRANSFER') {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Sender name" required>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name on bank account"
            />
          </FormField>
          <FormField label="Sender bank" required>
            <Input
              value={senderBank}
              onChange={(e) => setSenderBank(e.target.value)}
              placeholder="Your bank name"
            />
          </FormField>
          <FormField label="UTR / reference" required className="sm:col-span-2">
            <Input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="NEFT / IMPS / RTGS reference"
            />
          </FormField>
        </div>
      )
    }

    if (selectedKind === 'CRYPTO') {
      return (
        <FormField label="Transaction hash" required>
          <Input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Blockchain transaction hash"
          />
        </FormField>
      )
    }

    return (
      <FormField label="Payment reference" required>
        <Input
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="Transfer reference"
        />
      </FormField>
    )
  }

  if (methods.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <p className="text-body-sm text-fg-subtle">
          No deposit methods are available right now. Please contact support.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Deposit request"
          description={`Select a method, transfer funds, and submit the reference for review.${
            selected
              ? ` Minimum $${selected.minAmount}${selected.maxAmount ? ` · Maximum $${selected.maxAmount}` : ''}`
              : ''
          }`}
          as="h3"
        />

        <form className="mt-5 space-y-5" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-3">
              <FormField label="Amount (USD)" required>
                <Input
                  numeric
                  prefix="$"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.00"
                />
              </FormField>

              <div className="space-y-2">
                <p className="text-body-sm text-fg font-medium">Payment method</p>
                <div className="grid gap-3">
                  {methods.map((method) => (
                    <DepositMethodCard
                      key={method.id}
                      method={method}
                      selected={selected?.id === method.id}
                      onSelect={() => setSelectedId(method.id)}
                      showActions={false}
                      className={cn(selected?.id === method.id && 'bg-surface/70')}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {selected ? (
                <DepositMethodCard
                  method={selected}
                  showActions={false}
                  className="bg-surface/60"
                />
              ) : null}
              {renderSelectedDetails()}
              {renderReferenceFields()}
              <FormField label="Payment screenshot">
                <FileDropzone
                  hint="JPG, PNG, WebP or PDF. Attach the bank, UPI, or blockchain transfer proof."
                  onFileSelect={(file) => {
                    setProof(file)
                    toast.info('Proof attached')
                  }}
                  onFileClear={() => setProof(null)}
                />
              </FormField>
              <FormField label="Notes">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any details that help operations verify this deposit."
                />
              </FormField>
              <Button type="submit" className="w-full sm:w-auto" loading={submitting}>
                <Upload aria-hidden />
                Submit deposit request
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Pending review"
          description={
            pending
              ? `${pending.reference || pending.id} · $${pending.amount} awaiting operations review`
              : 'Submit a transfer reference to start review.'
          }
          as="h3"
        />
        <div className="mt-5">
          <StatusTimeline
            steps={DEPOSIT_TIMELINE_STEPS}
            activeIndex={timelineActiveIndex(pending?.status)}
          />
        </div>
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
        description="Fund your Growzy wallet using the payment methods configured by operations."
      />

      {isLoading ? (
        <Card variant="glass" className="p-6">
          <p className="text-body-sm text-fg-subtle">Loading deposit methods...</p>
        </Card>
      ) : (
        <DepositFlow methods={methods ?? []} />
      )}

      <RiskDisclosure />
    </div>
  )
}
