'use client'

import { useMemo, useState } from 'react'
import type { Deposit, PaymentMethod } from '@meridian/shared'
import { Bitcoin, Building2, Landmark, Upload } from 'lucide-react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import {
  useCreateDeposit,
  useDepositMethods,
  useDeposits,
  useUploadDepositProof,
} from '@/features/deposits/hooks'
import { ApiError } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

const DEPOSIT_TIMELINE_STEPS = [
  { id: 'submit', label: 'Submitted', done: false, current: true },
  { id: 'review', label: 'Under review', done: false },
  { id: 'credit', label: 'Credited', done: false },
]

function isCryptoDeposit(d: Deposit) {
  const type = d.method?.type ?? ''
  const name = d.method?.name ?? ''
  return (
    ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type) ||
    /USDT|USDC|BTC|ETH|crypto/i.test(name)
  )
}

function isCryptoMethod(m: PaymentMethod) {
  return (
    ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(m.type) ||
    /usdt|crypto|btc|eth/i.test(m.name)
  )
}

function pickMethod(
  methods: PaymentMethod[] | undefined,
  prefer: 'bank' | 'crypto' | 'mobile',
): PaymentMethod | undefined {
  if (!methods?.length) return undefined
  if (prefer === 'crypto') {
    return methods.find(isCryptoMethod)
  }
  if (prefer === 'mobile') {
    return (
      methods.find((m) => m.type === 'MOBILE_WALLET') ??
      methods.find((m) => /upi|jazz|easypaisa|mobile/i.test(m.name))
    )
  }
  return (
    methods.find((m) => m.type === 'BANK_TRANSFER' || m.type === 'MANUAL') ??
    methods.find((m) => /bank|imps|neft|rtgs/i.test(m.name)) ??
    methods.find((m) => !isCryptoMethod(m))
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
  const cryptoMethods = (methods ?? []).filter(isCryptoMethod)
  const coins = new Map<string, { id: string; label: string; networks: string[]; methodId: string }>()
  const addresses: Record<string, string> = {}
  const methodByKey: Record<string, PaymentMethod> = {}

  for (const m of cryptoMethods) {
    const coin =
      detail(m, 'coin', 'asset', 'symbol') ||
      (m.type.includes('USDT') ? 'USDT' : m.type === 'BTC' ? 'BTC' : m.type === 'ETH' ? 'ETH' : m.name)
    const network =
      detail(m, 'network', 'chain') ||
      (m.type.includes('TRC20')
        ? 'TRC20'
        : m.type.includes('BEP20')
          ? 'BEP20'
          : m.type === 'BTC'
            ? 'BTC'
            : m.type === 'ETH'
              ? 'ETH'
              : 'ERC20')
    const address = detail(m, 'address', 'walletAddress', 'depositAddress')
    const existing = coins.get(coin) ?? {
      id: coin,
      label: coin,
      networks: [],
      methodId: m.id,
    }
    if (!existing.networks.includes(network)) existing.networks.push(network)
    coins.set(coin, existing)
    const key = `${coin}-${network}`
    methodByKey[key] = m
    if (address) addresses[key] = address
  }

  return {
    coins: Array.from(coins.values()),
    addresses,
    methodByKey,
  }
}

function timelineActiveIndex(status: Deposit['status'] | undefined) {
  if (!status) return 0
  if (status === 'APPROVED') return 2
  if (status === 'UNDER_REVIEW' || status === 'PENDING') return 1
  return 0
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-caption text-fg-subtle">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-body-sm text-fg">
        <span className="break-all font-medium tabular-nums">{value}</span>
        <CopyButton value={value} label={label} />
      </span>
    </div>
  )
}

function DepositHistory({ rail }: { rail?: 'INR' | 'CRYPTO' }) {
  const { session } = useSession()
  const { data, isLoading } = useDeposits(undefined, { enabled: Boolean(session) })
  const rows = (data?.items ?? []).filter((d) => {
    if (!rail) return true
    return rail === 'CRYPTO' ? isCryptoDeposit(d) : !isCryptoDeposit(d)
  })
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        title="Deposit history"
        description="Recent requests and their review status."
        as="h3"
      />
      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading deposits…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No deposits yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-fg">{row.reference || row.id}</p>
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

function InrDepositPanel() {
  const { session } = useSession()
  const { data: methods, isLoading: methodsLoading } = useDepositMethods({
    enabled: Boolean(session),
  })
  const { data: depositsData } = useDeposits(undefined, { enabled: Boolean(session) })
  const createDeposit = useCreateDeposit()
  const uploadProof = useUploadDepositProof()
  const [amount, setAmount] = useState('500')
  const [proof, setProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const bankMethod = pickMethod(methods, 'bank')
  const mobileMethod = pickMethod(methods, 'mobile') ?? bankMethod
  const minAmount = bankMethod?.minAmount ?? '50'

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
    bankDetails.accountName ||
      bankDetails.accountNumber ||
      bankDetails.upiId ||
      bankDetails.bankName,
  )

  const sessionDeposits = depositsData?.items ?? []
  const pending = sessionDeposits.find(
    (d) =>
      (d.status === 'UNDER_REVIEW' || d.status === 'PENDING') && !isCryptoDeposit(d),
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = pickMethod(methods, 'bank') ?? pickMethod(methods, 'mobile')
    if (!method) {
      toast.error('No deposit methods are configured. Contact support.')
      return
    }
    setSubmitting(true)
    try {
      const deposit = await createDeposit.mutateAsync({ amount, methodId: method.id })
      if (proof) {
        await uploadProof.mutateAsync({ id: deposit.id, file: proof })
      }
      toast.success('Deposit submitted', 'Awaiting proof review.')
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

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="INR deposit"
            description="Enter the USD amount to credit, then transfer INR to the settlement account."
          />
          <form className="mt-5 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <FormField label="Amount (USD)" required hint={`Minimum $${minAmount}.`}>
              <Input
                numeric
                prefix="$"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
              />
            </FormField>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              loading={submitting}
              disabled={!hasBankDetails && !methodsLoading}
            >
              <Landmark aria-hidden />
              Submit deposit request
            </Button>
          </form>

          <div className="mt-8">
            <SectionHeader title="Bank details" as="h3" className="mb-3" />
            {methodsLoading ? (
              <p className="text-body-sm text-fg-subtle">Loading payment methods…</p>
            ) : hasBankDetails ? (
              <>
                <div className="rounded-xl border border-line bg-inset/40 px-4">
                  <DetailRow label="Bank" value={bankDetails.bankName} />
                  <DetailRow label="Account name" value={bankDetails.accountName} />
                  <DetailRow label="Account number" value={bankDetails.accountNumber} />
                  <DetailRow label="IFSC / Routing" value={bankDetails.ifsc} />
                  <DetailRow label="Branch" value={bankDetails.branch} />
                  <DetailRow label="UPI" value={bankDetails.upiId} />
                </div>
                {bankDetails.note ? (
                  <p className="mt-3 text-caption text-fg-subtle">{bankDetails.note}</p>
                ) : null}
              </>
            ) : (
              <p className="text-body-sm text-fg-subtle">
                No bank payment methods are configured yet. Contact support.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          {bankDetails.upiId ? (
            <Card variant="glass" className="p-5 sm:p-6">
              <SectionHeader title="UPI / QR" as="h3" description={`Pay to ${bankDetails.upiId}`} />
              <div className="mt-4 flex justify-center">
                <QrFrame label={bankDetails.upiId} />
              </div>
            </Card>
          ) : null}

          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="Upload payment screenshot"
              as="h3"
              description="JPG, PNG, WebP or PDF."
            />
            <div className="mt-4">
              <FileDropzone
                hint="Include the transfer reference in the frame when possible."
                onFileSelect={(file) => {
                  setProof(file)
                  toast.info('Screenshot attached')
                }}
              />
            </div>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              type="button"
              disabled={!proof}
              onClick={() =>
                toast.info(
                  proof
                    ? 'Proof will upload when you submit the deposit request.'
                    : 'Attach a screenshot first.',
                )
              }
            >
              <Upload aria-hidden />
              {proof ? 'Proof ready' : 'Attach proof'}
            </Button>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="Pending approval"
            description={
              pending
                ? `${pending.reference || pending.id} · $${pending.amount} under review`
                : 'No INR deposits awaiting review.'
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
        <DepositHistory rail="INR" />
      </div>
    </div>
  )
}

function CryptoDepositPanel() {
  const { session } = useSession()
  const { data: methods, isLoading: methodsLoading } = useDepositMethods({
    enabled: Boolean(session),
  })
  const createDeposit = useCreateDeposit()
  const [amount, setAmount] = useState('500')
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cryptoOptions = useMemo(() => cryptoOptionsFromMethods(methods), [methods])
  const [coin, setCoin] = useState('')
  const [network, setNetwork] = useState('')

  const selectedCoin = coin || cryptoOptions.coins[0]?.id || ''
  const coinMeta = cryptoOptions.coins.find((c) => c.id === selectedCoin)
  const selectedNetwork = network || coinMeta?.networks[0] || ''
  const addressKey = `${selectedCoin}-${selectedNetwork}`
  const address =
    cryptoOptions.addresses[addressKey] ??
    Object.values(cryptoOptions.addresses)[0] ??
    ''
  const selectedMethod =
    cryptoOptions.methodByKey[addressKey] ?? pickMethod(methods, 'crypto')
  const instructions = selectedMethod?.instructions ?? ''
  const minAmount = selectedMethod?.minAmount ?? '50'
  const hasCrypto = Boolean(address) || cryptoOptions.coins.length > 0

  async function onSubmit() {
    const method = selectedMethod ?? pickMethod(methods, 'crypto')
    if (!method) {
      toast.error('No crypto deposit methods are configured. Contact support.')
      return
    }
    if (!address) {
      toast.error('No deposit address configured for this network.')
      return
    }
    setSubmitting(true)
    try {
      await createDeposit.mutateAsync({
        amount,
        methodId: method.id,
        userReference: txHash || undefined,
      })
      toast.success('Deposit submitted', 'Awaiting on-chain confirmation and review.')
      setTxHash('')
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

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="Crypto deposit"
            description="Send only on the selected network. Wrong-chain transfers cannot be recovered."
          />
          {methodsLoading ? (
            <p className="mt-5 text-body-sm text-fg-subtle">Loading payment methods…</p>
          ) : !hasCrypto ? (
            <p className="mt-5 text-body-sm text-fg-subtle">
              No crypto payment methods are configured yet. Contact support.
            </p>
          ) : (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField label="Coin" required>
                  <Select
                    value={selectedCoin}
                    onValueChange={(v) => {
                      setCoin(v)
                      const next = cryptoOptions.coins.find((c) => c.id === v)
                      setNetwork(next?.networks[0] ?? '')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coin" />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoOptions.coins.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Network" required>
                  <Select value={selectedNetwork} onValueChange={setNetwork}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {(coinMeta?.networks ?? [selectedNetwork].filter(Boolean)).map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <FormField
                className="mt-4"
                label="Amount (USD)"
                required
                hint={`Minimum $${minAmount}.`}
              >
                <Input
                  numeric
                  prefix="$"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </FormField>

              <div className="mt-5 rounded-xl border border-line bg-inset/40 p-4">
                <p className="text-caption text-fg-subtle">
                  Deposit address · {selectedCoin} / {selectedNetwork}
                </p>
                {address ? (
                  <div className="mt-2 flex items-start gap-2">
                    <p className="min-w-0 flex-1 break-all font-mono text-body-sm text-fg">
                      {address}
                    </p>
                    <CopyButton value={address} label="Wallet address" />
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-fg-subtle">
                    No active wallet address for this method. Ask ops to publish one.
                  </p>
                )}
                {detail(selectedMethod, 'memo') ? (
                  <p className="mt-2 text-caption text-fg-subtle">
                    Memo / tag: {detail(selectedMethod, 'memo')}
                  </p>
                ) : null}
              </div>

              {instructions ? (
                <p className="mt-3 text-caption text-fg-subtle">{instructions}</p>
              ) : null}

              <FormField className="mt-4" label="Transaction hash" hint="Optional — helps matching.">
                <Input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x… or txid"
                  className="font-mono text-sm"
                />
              </FormField>

              <Button
                className="mt-4"
                disabled={!address}
                loading={submitting}
                onClick={() => void onSubmit()}
              >
                <Bitcoin aria-hidden />
                Submit deposit request
              </Button>
            </>
          )}
        </Card>

        <div className="space-y-5">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader title="Address QR" as="h3" />
            <div className="mt-4 flex justify-center">
              <QrFrame
                label={
                  address
                    ? `${selectedCoin} · ${selectedNetwork}`
                    : 'Address not configured'
                }
              />
            </div>
            <p className="mt-3 text-center text-caption text-fg-subtle">
              Copy the address above — QR is a visual aid only.
            </p>
          </Card>
        </div>
      </div>

      <DepositHistory rail="CRYPTO" />
    </div>
  )
}

export function DepositWorkspace() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Deposit"
        description="Add funds via INR bank transfer or crypto. Wallet credit after confirmation and review."
      />
      <RiskDisclosure />

      <Tabs defaultValue="inr">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="inr">
            <Building2 aria-hidden />
            INR Deposit
          </TabsTrigger>
          <TabsTrigger value="crypto">
            <Bitcoin aria-hidden />
            Crypto Deposit
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inr">
          <InrDepositPanel />
        </TabsContent>
        <TabsContent value="crypto">
          <CryptoDepositPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
