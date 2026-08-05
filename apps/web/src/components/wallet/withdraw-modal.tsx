'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Bitcoin, Building2, Plus } from 'lucide-react'

import { BankCard } from '@/components/wallet/bank-card'
import { SuccessModal } from '@/components/wallet/success-modal'
import { WalletCard } from '@/components/wallet/wallet-card'
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
import { CRYPTO_DEPOSIT_OPTIONS } from '@/lib/investor-demo-data'
import { WALLET_WITHDRAW_TIMELINE } from '@/mocks/investor'
import { ApiError } from '@/lib/api-client'
import { useWallet } from '@/features/wallet/hooks'
import { useCreateWithdrawal, usePayoutMethods } from '@/features/withdrawals/hooks'

type Rail = 'INR' | 'CRYPTO' | null
type Step = 'rail' | 'inr' | 'crypto' | 'add-bank' | 'add-wallet'

type BankAccount = {
  id: string
  label: string
  bankName: string
  accountName?: string
  accountNumberMasked: string
  ifsc: string
  primary?: boolean
}
type CryptoWallet = {
  id: string
  label: string
  network: string
  address: string
  addressMasked?: string
  coin: string
  primary?: boolean
}

export function WithdrawModal({
  open,
  onOpenChange,
  initialBanks = [],
  initialWallets = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBanks?: BankAccount[]
  initialWallets?: CryptoWallet[]
}) {
  const createWithdrawal = useCreateWithdrawal()
  const { data: payoutMethods } = usePayoutMethods({ enabled: open })
  const { data: wallet } = useWallet({ enabled: open })
  const availableBalance = wallet?.availableBalance ?? '0.00'
  const [step, setStep] = useState<Step>('rail')
  const [rail, setRail] = useState<Rail>(null)
  const [banks, setBanks] = useState<BankAccount[]>(initialBanks)
  const [wallets, setWallets] = useState<CryptoWallet[]>(initialWallets)
  const [bankId, setBankId] = useState(initialBanks.find((b) => b.primary)?.id ?? initialBanks[0]?.id)
  const [walletId, setWalletId] = useState(
    initialWallets.find((w) => w.primary)?.id ?? initialWallets[0]?.id,
  )
  const [amount, setAmount] = useState('100')
  const [successOpen, setSuccessOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payoutMethodId, setPayoutMethodId] = useState<string | undefined>()

  // Add bank form
  const [newBankName, setNewBankName] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newIfsc, setNewIfsc] = useState('')

  // Add wallet form
  const [newLabel, setNewLabel] = useState('')
  const [newCoin, setNewCoin] = useState('USDT')
  const [newNetwork, setNewNetwork] = useState('TRC20')
  const [newAddress, setNewAddress] = useState('')

  const coinMeta = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === newCoin)

  useEffect(() => {
    if (!open || !payoutMethods?.length) return
    setPayoutMethodId((current) => {
      if (current && payoutMethods.some((m) => m.id === current)) return current
      return (payoutMethods.find((m) => m.isDefault) ?? payoutMethods[0])?.id
    })
  }, [open, payoutMethods])

  function reset() {
    setStep('rail')
    setRail(null)
    setAmount('100')
    setNewBankName('')
    setNewAccountName('')
    setNewAccountNumber('')
    setNewIfsc('')
    setNewLabel('')
    setNewCoin('USDT')
    setNewNetwork('TRC20')
    setNewAddress('')
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function goBack() {
    if (step === 'add-bank') setStep('inr')
    else if (step === 'add-wallet') setStep('crypto')
    else if (step === 'inr' || step === 'crypto') setStep('rail')
  }

  async function submitWithdrawalRequest() {
    const methodId =
      payoutMethodId ??
      payoutMethods?.find((m) => m.isDefault)?.id ??
      payoutMethods?.[0]?.id

    if (!methodId) {
      toast.error('Add a verified payout method before withdrawing.')
      return
    }

    setSubmitting(true)
    try {
      const withdrawal = await createWithdrawal.mutateAsync({
        amount,
        payoutMethodId: methodId,
      })
      setReference(withdrawal.reference || withdrawal.id)
      handleOpenChange(false)
      setSuccessOpen(true)
      toast.success('Withdrawal submitted', withdrawal.reference)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not submit withdrawal',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function saveBank() {
    const id = `bank_${Date.now()}`
    const created: BankAccount = {
      id,
      label: newBankName || 'Bank account',
      bankName: newBankName,
      accountName: newAccountName,
      accountNumberMasked: `•••• ${newAccountNumber.slice(-4)}`,
      ifsc: newIfsc.toUpperCase(),
      primary: banks.length === 0,
    }
    setBanks((prev) => [...prev, created])
    setBankId(id)
    setStep('inr')
    toast.success('Bank account added')
  }

  function saveWallet() {
    const id = `cw_${Date.now()}`
    const created: CryptoWallet = {
      id,
      label: newLabel || `${newCoin} wallet`,
      coin: newCoin,
      network: newNetwork,
      address: newAddress,
      primary: wallets.length === 0,
    }
    setWallets((prev) => [...prev, created])
    setWalletId(id)
    setStep('crypto')
    toast.success('Wallet added')
  }

  const titles: Record<Step, { title: string; description: string; stepLabel?: string }> = {
    rail: {
      title: 'Withdraw',
      description: 'Choose where to receive your payout.',
      stepLabel: 'Step 1 of 2',
    },
    inr: {
      title: 'INR withdrawal',
      description: `Available $${availableBalance}`,
      stepLabel: 'INR',
    },
    crypto: {
      title: 'Crypto withdrawal',
      description: `Available $${availableBalance}`,
      stepLabel: 'Crypto',
    },
    'add-bank': {
      title: 'Add bank account',
      description: 'Must be in your verified name. Reviewed before first use.',
      stepLabel: 'New bank',
    },
    'add-wallet': {
      title: 'Add crypto wallet',
      description: 'Double-check network and address — transfers are irreversible.',
      stepLabel: 'New wallet',
    },
  }

  const meta = titles[step]
  const showBack = step !== 'rail'

  return (
    <>
      <WalletModalShell
        open={open}
        onOpenChange={handleOpenChange}
        title={meta.title}
        description={meta.description}
        stepLabel={meta.stepLabel}
        wide={step === 'inr' || step === 'crypto'}
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
              description="Payout to your bank account"
              icon={<Building2 className="size-5" aria-hidden />}
              onClick={() => {
                setRail('INR')
                setStep(banks.length === 0 ? 'add-bank' : 'inr')
              }}
            />
            <MethodTile
              title="Crypto"
              description="Payout to a saved wallet"
              icon={<Bitcoin className="size-5" aria-hidden />}
              accent="cyan"
              onClick={() => {
                setRail('CRYPTO')
                setStep(wallets.length === 0 ? 'add-wallet' : 'crypto')
              }}
            />
          </div>
        ) : null}

        {step === 'inr' ? (
          <div className="space-y-4">
            {banks.length === 0 ? (
              <p className="text-body-sm text-fg-muted">No bank accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {banks.map((b) => (
                  <BankCard
                    key={b.id}
                    masked
                    accountName={b.accountName ?? b.label}
                    bankName={b.bankName}
                    accountNumber={b.accountNumberMasked}
                    ifsc={b.ifsc}
                    selected={bankId === b.id}
                    onSelect={() => setBankId(b.id)}
                  />
                ))}
              </div>
            )}
            <Button type="button" variant="secondary" className="w-full" onClick={() => setStep('add-bank')}>
              <Plus aria-hidden />
              Add bank account
            </Button>
            <FormField label="Amount (USD)" required hint="Funds lock on submit until paid.">
              <Input
                numeric
                prefix="$"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!bankId || !amount || Number(amount) <= 0}
              onClick={() => void submitWithdrawalRequest()}
              loading={submitting}
              loadingText="Submitting…"
            >
              Submit withdrawal
            </Button>
          </div>
        ) : null}

        {step === 'add-bank' ? (
          <div className="space-y-4">
            <FormField label="Bank name" required>
              <Input value={newBankName} onChange={(e) => setNewBankName(e.target.value)} />
            </FormField>
            <FormField label="Account holder name" required>
              <Input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
            </FormField>
            <FormField label="Account number" required>
              <Input
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value)}
                numeric
              />
            </FormField>
            <FormField label="IFSC" required>
              <Input
                value={newIfsc}
                onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!newBankName || !newAccountName || !newAccountNumber || !newIfsc}
              onClick={saveBank}
            >
              Save bank account
            </Button>
          </div>
        ) : null}

        {step === 'crypto' ? (
          <div className="space-y-4">
            {wallets.length === 0 ? (
              <p className="text-body-sm text-fg-muted">No crypto wallets yet.</p>
            ) : (
              <div className="space-y-3">
                {wallets.map((w) => (
                  <WalletCard
                    key={w.id}
                    label={w.label}
                    coin={w.coin}
                    network={w.network}
                    address={w.address}
                    selected={walletId === w.id}
                    onSelect={() => setWalletId(w.id)}
                  />
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setStep('add-wallet')}
            >
              <Plus aria-hidden />
              Add wallet
            </Button>
            <FormField label="Amount (USD)" required>
              <Input
                numeric
                prefix="$"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!walletId || !amount || Number(amount) <= 0}
              onClick={() => void submitWithdrawalRequest()}
              loading={submitting}
              loadingText="Submitting…"
            >
              Submit withdrawal
            </Button>
          </div>
        ) : null}

        {step === 'add-wallet' ? (
          <div className="space-y-4">
            <FormField label="Label" required>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Personal USDT"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Coin" required>
                <Select
                  value={newCoin}
                  onValueChange={(v) => {
                    setNewCoin(v)
                    const next = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === v)
                    setNewNetwork(next?.networks[0] ?? 'TRC20')
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
                <Select value={newNetwork} onValueChange={setNewNetwork}>
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
            <FormField label="Wallet address" required>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="font-mono text-sm"
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!newLabel || !newAddress}
              onClick={saveWallet}
            >
              Save wallet
            </Button>
          </div>
        ) : null}

        <span className="sr-only">{rail}</span>
      </WalletModalShell>

      <SuccessModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="Withdrawal requested"
        description="Funds are locked while the desk reviews and pays your request."
        reference={reference}
        timelineSteps={WALLET_WITHDRAW_TIMELINE}
        timelineActiveIndex={0}
        primaryLabel="Back to Wallet"
      />
    </>
  )
}
