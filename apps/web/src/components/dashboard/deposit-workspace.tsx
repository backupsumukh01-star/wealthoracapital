'use client'

import { useMemo, useState } from 'react'
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
import { Progress } from '@/components/ui/progress'
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
  CRYPTO_DEPOSIT_OPTIONS,
  DEPOSIT_TIMELINE_STEPS,
  DEMO_DEPOSITS,
  INR_BANK_DETAILS,
} from '@/lib/investor-demo-data'
import { formatDateTime } from '@/lib/format'

function DetailRow({ label, value }: { label: string; value: string }) {
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
  const rows = DEMO_DEPOSITS.filter((d) => !rail || d.rail === rail)
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        title="Deposit history"
        description="Recent requests and their review status."
        as="h3"
      />
      <ul className="mt-4 divide-y divide-line/70">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-fg">{row.id}</p>
              <p className="text-caption text-fg-subtle">
                {row.method} · {formatDateTime(row.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Money value={row.amount} className="text-body-sm font-medium" />
              <StatusPill status={row.status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function InrDepositPanel() {
  const [amount, setAmount] = useState('500')
  const pending = DEMO_DEPOSITS.find((d) => d.status === 'UNDER_REVIEW' && d.rail === 'INR')

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="INR deposit"
            description="Enter the USD amount to credit, then transfer INR to the settlement account."
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success('Deposit submitted (demo)', 'Awaiting proof review.')
            }}
          >
            <FormField label="Amount (USD)" required hint="Minimum $50 · demo FX applied at desk rate.">
              <Input
                numeric
                prefix="$"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
              />
            </FormField>
            <Button type="submit" className="w-full sm:w-auto">
              <Landmark aria-hidden />
              Continue to transfer
            </Button>
          </form>

          <div className="mt-8">
            <SectionHeader title="Bank details" as="h3" className="mb-3" />
            <div className="rounded-xl border border-line bg-inset/40 px-4">
              <DetailRow label="Bank" value={INR_BANK_DETAILS.bankName} />
              <DetailRow label="Account name" value={INR_BANK_DETAILS.accountName} />
              <DetailRow label="Account number" value={INR_BANK_DETAILS.accountNumber} />
              <DetailRow label="IFSC" value={INR_BANK_DETAILS.ifsc} />
              <DetailRow label="UPI" value={INR_BANK_DETAILS.upiId} />
            </div>
            <p className="mt-3 text-caption text-fg-subtle">{INR_BANK_DETAILS.note}</p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader title="UPI / QR" as="h3" description="Scan or pay to the UPI ID above." />
            <div className="mt-4 flex justify-center">
              <QrFrame label="Demo QR · not a live payment code" />
            </div>
          </Card>

          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="Upload payment screenshot"
              as="h3"
              description="JPG, PNG, WebP or PDF."
            />
            <div className="mt-4">
              <FileDropzone
                hint="Include the transfer reference in the frame when possible."
                onFileSelect={() => toast.info('Screenshot attached (demo)')}
              />
            </div>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => toast.success('Proof uploaded (demo)', 'Ops will review shortly.')}
            >
              <Upload aria-hidden />
              Submit proof
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
                ? `${pending.id} · $${pending.amount} under review`
                : 'No INR deposits awaiting review.'
            }
            as="h3"
          />
          <div className="mt-5">
            <StatusTimeline steps={DEPOSIT_TIMELINE_STEPS} activeIndex={pending ? 2 : 0} />
          </div>
        </Card>
        <DepositHistory rail="INR" />
      </div>
    </div>
  )
}

function CryptoDepositPanel() {
  const [coin, setCoin] = useState('USDT')
  const [network, setNetwork] = useState('TRC20')

  const coinMeta = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === coin)!
  const networks = coinMeta.networks
  const addressKey = `${coin}-${network}`
  const address =
    CRYPTO_DEPOSIT_OPTIONS.addresses[addressKey] ??
    Object.values(CRYPTO_DEPOSIT_OPTIONS.addresses)[0] ??
    ''
  const required = CRYPTO_DEPOSIT_OPTIONS.confirmationsRequired[network] ?? 12
  const liveConfirmations = 7
  const pct = Math.min(100, Math.round((liveConfirmations / required) * 100))

  const networkOptions = useMemo(() => networks, [networks])

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="Crypto deposit"
            description="Send only on the selected network. Wrong-chain transfers cannot be recovered."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                  <SelectValue placeholder="Select coin" />
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
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networkOptions.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-inset/40 p-4">
            <p className="text-caption text-fg-subtle">Deposit address · {coin} / {network}</p>
            <div className="mt-2 flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all font-mono text-body-sm text-fg">{address}</p>
              <CopyButton value={address} label="Wallet address" />
            </div>
          </div>

          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => toast.info('Waiting for on-chain detection (demo)')}
          >
            <Bitcoin aria-hidden />
            I’ve sent the transfer
          </Button>
        </Card>

        <div className="space-y-5">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader title="Address QR" as="h3" />
            <div className="mt-4 flex justify-center">
              <QrFrame label={`${coin} · ${network}`} />
            </div>
          </Card>

          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="Blockchain confirmations"
              as="h3"
              description={`Demo inbound · ${liveConfirmations} of ${required} confirmations`}
            />
            <div className="mt-4 space-y-2">
              <Progress value={pct} />
              <p className="text-caption text-fg-subtle">
                Credits unlock after confirmations clear, then a short ops review.
              </p>
            </div>
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
