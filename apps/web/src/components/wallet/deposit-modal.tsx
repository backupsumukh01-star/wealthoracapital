'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Bitcoin, Building2, Landmark, Smartphone } from 'lucide-react'

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
import {
  CRYPTO_DEPOSIT_OPTIONS,
  INR_BANK_DETAILS,
  WALLET_DEPOSIT_TIMELINE,
} from '@/lib/investor-demo-data'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

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

function nextReference() {
  return `DEP-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`
}

export function DepositModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { submitDeposit } = useInvestorLifecycle()
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

  const coinMeta = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === coin)
  const addressKey = `${coin}-${network}`
  const address =
    CRYPTO_DEPOSIT_OPTIONS.addresses[addressKey] ??
    Object.values(CRYPTO_DEPOSIT_OPTIONS.addresses)[0] ??
    ''

  const meta = useMemo(() => {
    switch (step) {
      case 'rail':
        return {
          title: 'Deposit',
          description: 'Choose how you want to add funds to your Growzy wallet.',
          stepLabel: 'Step 1 of 3',
        }
      case 'inr-channel':
        return {
          title: 'INR deposit',
          description: 'Pay via UPI apps or bank transfer (IMPS / NEFT / RTGS).',
          stepLabel: 'Step 2 of 3',
        }
      case 'upi-amount':
      case 'upi-pay':
      case 'upi-proof':
        return {
          title: 'UPI deposit',
          description: 'Pay with your preferred UPI app, then upload proof.',
          stepLabel: 'INR · UPI',
        }
      case 'imps':
        return {
          title: 'Bank transfer',
          description: 'IMPS / NEFT / RTGS to the Growzy settlement account.',
          stepLabel: 'INR · IMPS',
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
    setCoin('USDT')
    setNetwork('TRC20')
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

  function submitRequest() {
    const ref = nextReference()
    setReference(ref)
    const result = submitDeposit({
      amount,
      method:
        step === 'crypto'
          ? `${coin} ${network}`
          : channel === 'UPI'
            ? 'UPI'
            : channel ?? 'Bank transfer',
      reference: utr || txHash || ref,
      proofLabel: proof?.name,
    })
    if (!result.ok) {
      toast.error(result.error ?? 'Could not submit deposit')
      return
    }
    handleOpenChange(false)
    setSuccessOpen(true)
    toast.success('Deposit submitted', result.deposit?.id ?? ref)
  }

  const showBack = step !== 'rail'

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

        {step === 'rail' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <MethodTile
              title="INR"
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
            <FormField label="Amount (USD equivalent)" required hint="Desk converts at the live INR rate.">
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
            <p className="text-body-sm text-fg-muted">
              Paying <span className="font-medium tabular-nums text-fg">${amount}</span> via UPI ·{' '}
              <span className="font-mono text-fg">{INR_BANK_DETAILS.upiId}</span>
            </p>
            <UpiAppCards amount={amount} onOpened={() => toast.info('Opened UPI app (demo link)')} />
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
              onClick={submitRequest}
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
            <BankCard
              accountName={INR_BANK_DETAILS.accountName}
              bankName={INR_BANK_DETAILS.bankName}
              accountNumber={INR_BANK_DETAILS.accountNumber}
              ifsc={INR_BANK_DETAILS.ifsc}
              branch={INR_BANK_DETAILS.branch}
            />
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
            <p className="text-caption text-fg-subtle">{INR_BANK_DETAILS.note}</p>
            <Button
              className="w-full"
              disabled={!proof || !utr.trim() || !amount || Number(amount) <= 0}
              onClick={submitRequest}
            >
              Submit request
            </Button>
          </div>
        ) : null}

        {step === 'crypto' ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Coin" required>
                <Select
                  value={coin}
                  onValueChange={(v) => {
                    setCoin(v)
                    const next = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === v)
                    setNetwork(next?.networks[0] ?? 'TRC20')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_DEPOSIT_OPTIONS.coins.map((c) => (
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
                    {(coinMeta?.networks ?? []).map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <QrCard address={address} label={`${coin} · ${network}`} />

            <FormField label="Transaction hash" hint="Optional — helps ops match your transfer.">
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x… or txid"
                className="font-mono text-sm"
              />
            </FormField>

            <Button className="w-full" onClick={submitRequest}>
              Submit deposit request
            </Button>
          </div>
        ) : null}

        {/* silence unused rail in UI tree */}
        <span className="sr-only">{rail}{channel}</span>
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
