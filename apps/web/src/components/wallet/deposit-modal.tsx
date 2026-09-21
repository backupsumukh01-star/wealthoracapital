'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Bitcoin, Building2, Landmark, Smartphone } from 'lucide-react'
import type { PaymentMethod } from '@meridian/shared'

import { BankCard } from '@/components/wallet/bank-card'
import { ProofUpload } from '@/components/wallet/proof-upload'
import { QrCard } from '@/components/wallet/qr-card'
import { SuccessModal } from '@/components/wallet/success-modal'
import { UpiAppCards } from '@/components/wallet/upi-app-cards'
import { MethodTile, WalletModalShell } from '@/components/wallet/wallet-modal-shell'
import { Button } from '@/components/ui/button'
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
import { ApiError } from '@/lib/api-client'
import {
  useCancelDeposit,
  useCreateDeposit,
  useDepositMethods,
  useUploadDepositProof,
} from '@/features/deposits/hooks'

type Rail = 'INR' | 'CRYPTO' | null
type InrChannel = 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | null
type Step =
  | 'rail'
  | 'inr-channel'
  | 'upi-amount'
  | 'upi-pay'
  | 'upi-proof'
  | 'imps'
  | 'crypto'
  | 'done'

const WALLET_DEPOSIT_TIMELINE = [
  { id: 'submit', label: 'Submitted', done: false, current: true },
  { id: 'review', label: 'Under review', done: false },
  { id: 'credit', label: 'Credited', done: false },
]

function pickMethod(
  methods: PaymentMethod[] | undefined,
  prefer: 'bank' | 'crypto' | 'mobile',
): PaymentMethod | undefined {
  if (!methods?.length) return undefined
  if (prefer === 'crypto') {
    return (
      methods.find((m) =>
        ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(m.type),
      ) ?? methods.find((m) => /usdt|crypto|btc|eth/i.test(m.name))
    )
  }
  if (prefer === 'mobile') {
    return (
      methods.find((m) => m.type === 'UPI' || m.type === 'MOBILE_WALLET') ??
      methods.find((m) => m.upi?.upiId) ??
      methods.find((m) => /upi|jazz|easypaisa|mobile/i.test(m.name))
    )
  }
  return (
    methods.find((m) => m.type === 'BANK_TRANSFER' || m.type === 'MANUAL') ??
    methods.find((m) => m.bank?.accountNumber) ??
    methods.find((m) => /bank|imps|neft|rtgs/i.test(m.name)) ??
    methods[0]
  )
}

function detail(method: PaymentMethod | undefined, ...keys: string[]) {
  if (!method) return ''
  for (const key of keys) {
    const value = method.accountDetails?.[key]
    if (value?.trim()) return value
  }
  return ''
}

function cryptoOptionsFromMethods(methods: PaymentMethod[] | undefined) {
  const cryptoMethods = (methods ?? []).filter((m) =>
    ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(m.type) ||
    /usdt|crypto|btc|eth/i.test(m.name),
  )
  const coins = new Map<string, { id: string; label: string; networks: string[] }>()
  const addresses: Record<string, string> = {}

  for (const m of cryptoMethods) {
    const coin =
      detail(m, 'coin', 'asset', 'symbol') ||
      (m.type.includes('USDT') ? 'USDT' : m.type === 'BTC' ? 'BTC' : m.type === 'ETH' ? 'ETH' : m.name)
    const network =
      detail(m, 'network', 'chain') ||
      (m.type.includes('TRC20') ? 'TRC20' : m.type.includes('BEP20') ? 'BEP20' : 'ERC20')
    const address = detail(m, 'address', 'walletAddress', 'depositAddress')
    const existing = coins.get(coin) ?? { id: coin, label: coin, networks: [] }
    if (!existing.networks.includes(network)) existing.networks.push(network)
    coins.set(coin, existing)
    if (address) addresses[`${coin}-${network}`] = address
  }

  return {
    coins: Array.from(coins.values()),
    addresses,
  }
}

export function DepositModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: methods } = useDepositMethods({ enabled: open })
  const createDeposit = useCreateDeposit()
  const uploadProof = useUploadDepositProof()
  const cancelDeposit = useCancelDeposit()
  const [step, setStep] = useState<Step>('rail')
  const [rail, setRail] = useState<Rail>(null)
  const [channel, setChannel] = useState<InrChannel>(null)
  const [amount, setAmount] = useState('500')
  const [utr, setUtr] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [coin, setCoin] = useState('USDT')
  const [network, setNetwork] = useState('TRC20')
  const [txHash, setTxHash] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const bankMethod = pickMethod(methods, 'bank')
  const mobileMethod = pickMethod(methods, 'mobile') ?? bankMethod
  const cryptoMethod = pickMethod(methods, 'crypto')
  const cryptoOptions = useMemo(() => cryptoOptionsFromMethods(methods), [methods])
  const coinMeta = cryptoOptions.coins.find((c) => c.id === coin)
  const addressKey = `${coin}-${network}`
  const address =
    cryptoOptions.addresses[addressKey] ??
    Object.values(cryptoOptions.addresses)[0] ??
    detail(cryptoMethod, 'address', 'walletAddress', 'depositAddress')

  const bankDetails = {
    accountName: detail(bankMethod, 'accountName', 'accountHolder', 'beneficiary'),
    bankName: detail(bankMethod, 'bankName', 'bank'),
    accountNumber: detail(bankMethod, 'accountNumber', 'account'),
    ifsc: detail(bankMethod, 'ifsc', 'routingNumber'),
    branch: detail(bankMethod, 'branch'),
    upiId: detail(mobileMethod ?? bankMethod, 'upiId', 'upi', 'vpa'),
    note: bankMethod?.instructions || mobileMethod?.instructions || '',
  }
  const hasBankDetails = Boolean(
    bankDetails.accountName || bankDetails.accountNumber || bankDetails.upiId,
  )
  const hasCryptoAddress = Boolean(address)

  const meta = useMemo(() => {
    switch (step) {
      case 'rail':
        return {
          title: 'Deposit',
          description: 'Choose how you want to add funds to your Wealthora wallet.',
          stepLabel: 'Step 1 of 3',
        }
      case 'inr-channel':
        return {
          title: 'Bank / UPI deposit',
          description: 'Pay via UPI apps or bank transfer (IMPS / NEFT / RTGS).',
          stepLabel: 'Step 2 of 3',
        }
      case 'upi-amount':
      case 'upi-pay':
      case 'upi-proof':
        return {
          title: 'UPI deposit',
          description: 'Pay with your preferred UPI app, then upload proof.',
          stepLabel: 'UPI',
        }
      case 'imps':
        return {
          title: 'Bank transfer',
          description: 'IMPS / NEFT / RTGS to the Wealthora settlement account.',
          stepLabel: 'Bank transfer',
        }
      case 'crypto':
        return {
          title: 'Crypto deposit',
          description: 'Send only on the selected network.',
          stepLabel: 'Crypto',
        }
      default:
        return { title: 'Deposit', description: undefined, stepLabel: undefined }
    }
  }, [step])

  function reset() {
    setStep('rail')
    setRail(null)
    setChannel(null)
    setAmount('500')
    setUtr('')
    setProof(null)
    setCoin(cryptoOptions.coins[0]?.id ?? 'USDT')
    setNetwork(cryptoOptions.coins[0]?.networks[0] ?? 'TRC20')
    setTxHash('')
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function goBack() {
    if (step === 'inr-channel') setStep('rail')
    else if (step === 'upi-amount') setStep('inr-channel')
    else if (step === 'upi-pay') setStep('upi-amount')
    else if (step === 'upi-proof') setStep('upi-pay')
    else if (step === 'imps') setStep('inr-channel')
    else if (step === 'crypto') setStep('rail')
  }

  async function submitRequest() {
    const prefer =
      step === 'crypto' ? 'crypto' : channel === 'UPI' ? 'mobile' : 'bank'
    const method = pickMethod(methods, prefer)
    if (!method) {
      toast.error('No deposit methods are configured. Contact support.')
      return
    }

    if (!proof) {
      toast.error('Payment screenshot is required.')
      return
    }

    setSubmitting(true)
    try {
      const deposit = await createDeposit.mutateAsync({
        amount,
        methodId: method.id,
        userReference: utr || txHash || undefined,
      })
      try {
        const withProof = await uploadProof.mutateAsync({ id: deposit.id, file: proof })
        if (!withProof.hasProof) {
          throw new Error('Proof upload did not save. Please try again.')
        }
      } catch (proofError) {
        try {
          await cancelDeposit.mutateAsync(deposit.id)
        } catch {
          // best-effort rollback
        }
        throw proofError
      }
      setReference(deposit.reference || deposit.id)
      handleOpenChange(false)
      setSuccessOpen(true)
      toast.success('Deposit submitted', deposit.reference)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not submit deposit',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const showBack = step !== 'rail'
  const noMethods = open && methods !== undefined && methods.length === 0

  return (
    <>
      <WalletModalShell
        open={open}
        onOpenChange={handleOpenChange}
        title={meta.title}
        description={meta.description}
        stepLabel={meta.stepLabel}
        wide={step === 'crypto' || step === 'imps'}
      >
        {showBack ? (
          <button
            type="button"
            onClick={goBack}
            className="mb-4 inline-flex items-center gap-1.5 text-caption font-medium text-fg-subtle hover:text-fg"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back
          </button>
        ) : null}

        {noMethods ? (
          <p className="text-body-sm text-fg-muted">No payment methods configured</p>
        ) : null}

        {!noMethods && step === 'rail' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <MethodTile
              title="Bank / UPI"
              description="UPI or IMPS / NEFT / RTGS"
              icon={<Building2 className="size-5" aria-hidden />}
              onClick={() => {
                setRail('INR')
                setStep('inr-channel')
              }}
            />
            <MethodTile
              title="Crypto"
              description="USDT, USDC, BTC, ETH"
              icon={<Bitcoin className="size-5" aria-hidden />}
              accent="cyan"
              onClick={() => {
                setRail('CRYPTO')
                setStep('crypto')
              }}
            />
          </div>
        ) : null}

        {step === 'inr-channel' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <MethodTile
              title="UPI"
              description="Google Pay, PhonePe, Paytm"
              icon={<Smartphone className="size-5" aria-hidden />}
              onClick={() => {
                setChannel('UPI')
                setStep('upi-amount')
              }}
            />
            <MethodTile
              title="IMPS"
              description="Instant bank transfer"
              icon={<Landmark className="size-5" aria-hidden />}
              onClick={() => {
                setChannel('IMPS')
                setStep('imps')
              }}
            />
            <MethodTile
              title="NEFT"
              description="Same-day bank transfer"
              icon={<Landmark className="size-5" aria-hidden />}
              onClick={() => {
                setChannel('NEFT')
                setStep('imps')
              }}
            />
            <MethodTile
              title="RTGS"
              description="High-value bank transfer"
              icon={<Landmark className="size-5" aria-hidden />}
              onClick={() => {
                setChannel('RTGS')
                setStep('imps')
              }}
            />
          </div>
        ) : null}

        {step === 'upi-amount' ? (
          <div className="space-y-5">
            <FormField label="Amount (USD)" required hint="Enter the USD amount you are depositing.">
              <Input
                numeric
                prefix="$"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!amount || Number(amount) <= 0}
              onClick={() => setStep('upi-pay')}
            >
              Continue to UPI apps
            </Button>
          </div>
        ) : null}

        {step === 'upi-pay' ? (
          <div className="space-y-5">
            {bankDetails.upiId ? (
              <p className="text-body-sm text-fg-muted">
                Paying <span className="font-medium tabular-nums text-fg">${amount}</span> via UPI ·{' '}
                <span className="font-mono text-fg">{bankDetails.upiId}</span>
              </p>
            ) : (
              <p className="text-body-sm text-fg-muted">No payment methods configured</p>
            )}
            <UpiAppCards amount={amount} onOpened={() => toast.info('Opened UPI app')} />
            <Button className="w-full" onClick={() => setStep('upi-proof')}>
              I’ve paid — upload proof
            </Button>
          </div>
        ) : null}

        {step === 'upi-proof' ? (
          <div className="space-y-4">
            <FormField label="Payment proof" required>
              <ProofUpload onFileSelect={setProof} />
            </FormField>
            <FormField label="UTR / Reference number" hint="Optional but speeds up matching.">
              <Input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 312345678901"
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!proof}
              onClick={() => void submitRequest()}
              loading={submitting}
              loadingText="Submitting…"
            >
              Submit request
            </Button>
          </div>
        ) : null}

        {step === 'imps' ? (
          <div className="space-y-5">
            <p className="text-body-sm text-fg-muted">
              Paying via <span className="font-medium text-fg">{channel ?? 'IMPS'}</span>
            </p>
            {hasBankDetails ? (
              <BankCard
                accountName={bankDetails.accountName}
                bankName={bankDetails.bankName}
                accountNumber={bankDetails.accountNumber}
                ifsc={bankDetails.ifsc}
                branch={bankDetails.branch}
              />
            ) : (
              <p className="text-body-sm text-fg-muted">No payment methods configured</p>
            )}
            <FormField label="Amount (USD equivalent)" required>
              <Input
                numeric
                prefix="$"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <FormField label="Payment proof" required>
              <ProofUpload onFileSelect={setProof} />
            </FormField>
            <FormField label="UTR / Reference number" required>
              <Input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UTR"
              />
            </FormField>
            {bankDetails.note ? (
              <p className="text-caption text-fg-subtle">{bankDetails.note}</p>
            ) : null}
            <Button
              className="w-full"
              disabled={!proof || !utr.trim() || !amount || Number(amount) <= 0 || !hasBankDetails}
              onClick={() => void submitRequest()}
              loading={submitting}
              loadingText="Submitting…"
            >
              Submit request
            </Button>
          </div>
        ) : null}

        {step === 'crypto' ? (
          <div className="space-y-4">
            {!hasCryptoAddress && !cryptoOptions.coins.length ? (
              <p className="text-body-sm text-fg-muted">No payment methods configured</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Coin" required>
                    <Select
                      value={coin}
                      onValueChange={(v) => {
                        setCoin(v)
                        const next = cryptoOptions.coins.find((c) => c.id === v)
                        setNetwork(next?.networks[0] ?? 'TRC20')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(cryptoOptions.coins.length
                          ? cryptoOptions.coins
                          : [{ id: coin, label: coin, networks: [network] }]
                        ).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Network" required>
                    <Select value={network} onValueChange={setNetwork}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(coinMeta?.networks?.length ? coinMeta.networks : [network]).map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                {hasCryptoAddress ? (
                  <QrCard address={address} label={`${coin} · ${network}`} />
                ) : (
                  <p className="text-body-sm text-fg-muted">No payment methods configured</p>
                )}

                <FormField label="Transaction hash" hint="Optional — helps ops match your transfer.">
                  <Input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x… or txid"
                    className="font-mono text-sm"
                  />
                </FormField>

                <Button
                  className="w-full"
                  disabled={!hasCryptoAddress}
                  onClick={() => void submitRequest()}
                  loading={submitting}
                  loadingText="Submitting…"
                >
                  Submit deposit request
                </Button>
              </>
            )}
          </div>
        ) : null}

        <span className="sr-only">
          {rail === 'CRYPTO' ? 'Crypto' : rail === 'INR' ? 'Bank / UPI' : ''}
          {channel ? ` ${channel}` : ''}
        </span>
      </WalletModalShell>

      <SuccessModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="Deposit submitted"
        description="Your request is in the review queue. You’ll be notified when funds are credited."
        reference={reference}
        timelineSteps={WALLET_DEPOSIT_TIMELINE}
        timelineActiveIndex={2}
        primaryLabel="Back to Wallet"
      />
    </>
  )
}
