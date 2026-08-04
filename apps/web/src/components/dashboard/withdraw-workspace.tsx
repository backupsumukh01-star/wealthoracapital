'use client'

import { useMemo, useState } from 'react'
import { Bitcoin, Building2, Wallet } from 'lucide-react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import type { MoneyString } from '@meridian/shared'

import { DEMO_WALLET } from '@/lib/dashboard-data'
import {
  CRYPTO_DEPOSIT_OPTIONS,
  DEMO_WITHDRAWALS,
  SAVED_CRYPTO_WALLETS,
  SAVED_INR_ACCOUNTS,
} from '@/lib/investor-demo-data'
import { formatDateTime } from '@/lib/format'

const NETWORK_FEE: Record<string, string> = {
  TRC20: '1.00',
  ERC20: '4.50',
  BEP20: '0.80',
  Bitcoin: '8.00',
}

function WithdrawalHistory({ rail }: { rail?: 'INR' | 'CRYPTO' }) {
  const rows = DEMO_WITHDRAWALS.filter((w) => !rail || w.rail === rail)
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader title="Withdrawal history" as="h3" description="Paid and open requests." />
      <ul className="mt-4 divide-y divide-line/70">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-fg">{row.id}</p>
              <p className="text-caption text-fg-subtle">
                {row.destination} · {formatDateTime(row.createdAt)}
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

function InrWithdrawPanel() {
  const [bankId, setBankId] = useState(SAVED_INR_ACCOUNTS.find((b) => b.primary)?.id ?? 'bank_1')
  const [amount, setAmount] = useState('100')
  const pending = DEMO_WITHDRAWALS.find((w) => w.status === 'PENDING' && w.rail === 'INR')

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="INR withdrawal"
            description="Funds lock immediately on submit until paid or rejected."
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success('Withdrawal requested (demo)', 'Pending desk review.')
            }}
          >
            <FormField label="Bank account" required>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_INR_ACCOUNTS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bankName} · {b.accountNumberMasked}
                      {b.primary ? ' (primary)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Amount (USD)" required hint={`Available $${DEMO_WALLET.availableBalance}`}>
              <Input
                numeric
                prefix="$"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <Button type="submit" className="w-full sm:w-auto">
              Withdraw
            </Button>
          </form>
        </Card>

        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Pending status" as="h3" />
          {pending ? (
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-sm font-medium text-fg">{pending.id}</p>
                <StatusPill status={pending.status} />
              </div>
              <p className="mt-2 text-caption text-fg-muted">
                <Money value={pending.amount} /> · {pending.destination}
              </p>
              <p className="mt-1 text-caption text-fg-subtle">
                Submitted {formatDateTime(pending.createdAt)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-body-sm text-fg-subtle">No open INR withdrawals.</p>
          )}
        </Card>
      </div>
      <WithdrawalHistory rail="INR" />
    </div>
  )
}

function CryptoWithdrawPanel() {
  const [coin, setCoin] = useState('USDT')
  const [network, setNetwork] = useState('TRC20')
  const [walletId, setWalletId] = useState(SAVED_CRYPTO_WALLETS[0]?.id ?? '')
  const [customAddress, setCustomAddress] = useState('')
  const [amount, setAmount] = useState('250')

  const coinMeta = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === coin)!
  const fee = NETWORK_FEE[network] ?? '1.00'
  const net = Math.max(0, Number(amount || 0) - Number(fee)).toFixed(2)

  const walletsForCoin = useMemo(
    () => SAVED_CRYPTO_WALLETS.filter((w) => w.coin === coin),
    [coin],
  )

  return (
    <div className="space-y-5">
      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Crypto withdrawal"
          description="Double-check network and address. Irreversible once broadcast."
        />
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            toast.success('Crypto withdrawal submitted (demo)')
          }}
        >
          <FormField label="Coin" required>
            <Select
              value={coin}
              onValueChange={(v) => {
                setCoin(v)
                const next = CRYPTO_DEPOSIT_OPTIONS.coins.find((c) => c.id === v)
                setNetwork(next?.networks[0] ?? 'TRC20')
                const match = SAVED_CRYPTO_WALLETS.find((w) => w.coin === v)
                setWalletId(match?.id ?? '')
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
                {coinMeta.networks.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Saved wallet" className="sm:col-span-2">
            <Select
              value={walletId || 'custom'}
              onValueChange={(v) => {
                setWalletId(v === 'custom' ? '' : v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {walletsForCoin.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.label} · {w.network}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Enter address manually</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          {!walletId ? (
            <FormField label="Wallet address" required className="sm:col-span-2">
              <Input
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="Paste destination address"
                className="font-mono text-sm"
              />
            </FormField>
          ) : null}
          <FormField label="Amount (USD)" required>
            <Input
              numeric
              prefix="$"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
          <div className="rounded-xl border border-line bg-inset/40 p-4 sm:col-span-1">
            <p className="text-caption text-fg-subtle">Estimated network fee</p>
            <p className="mt-1 text-body font-medium tabular-nums text-fg">${fee}</p>
            <p className="mt-2 text-caption text-fg-muted">
              You receive ~ <span className="tabular-nums text-fg">${net}</span>
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Withdraw</Button>
          </div>
        </form>
      </Card>
      <WithdrawalHistory rail="CRYPTO" />
    </div>
  )
}

export function WithdrawWorkspace() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Withdraw"
        description="Request a payout to a saved bank account or crypto wallet."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Available to withdraw"
          icon={Wallet}
          value={<Money value={DEMO_WALLET.availableBalance} />}
          hint="Balance less amounts locked in pending requests."
        />
        <StatCard
          label="Locked in pending"
          value={<Money value={DEMO_WALLET.pendingWithdrawal} />}
        />
        <StatCard label="Minimum withdrawal" value={<Money value={'50.00' as MoneyString} />} />
      </div>

      <Tabs defaultValue="inr">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="inr">
            <Building2 aria-hidden />
            INR Withdrawal
          </TabsTrigger>
          <TabsTrigger value="crypto">
            <Bitcoin aria-hidden />
            Crypto Withdrawal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inr">
          <InrWithdrawPanel />
        </TabsContent>
        <TabsContent value="crypto">
          <CryptoWithdrawPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
