'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Receipt,
  Wallet,
} from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { StatusPill } from '@/components/dashboard/status-pill'
import { StatusTimeline } from '@/components/dashboard/status-timeline'
import { DepositModal } from '@/components/wallet/deposit-modal'
import { WithdrawModal } from '@/components/wallet/withdraw-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { DEMO_WALLET } from '@/lib/dashboard-data'
import { WALLET_DEPOSIT_TIMELINE } from '@/lib/investor-demo-data'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'
import { useAdminOs } from '@/providers/admin-os-provider'

export function WalletCenter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { canDeposit, session, sessionDeposits, sessionWithdrawals, accountStatus } =
    useInvestorLifecycle()
  const { state, ready } = useAdminOs()
  const cms = ready ? state.platformCms.wallet : null
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  function tryDeposit() {
    if (!canDeposit) return
    setDepositOpen(true)
  }

  function tryWithdraw() {
    if (!canDeposit) return
    setWithdrawOpen(true)
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'deposit') {
      if (canDeposit) setDepositOpen(true)
      router.replace(ROUTES.dashboard.wallet, { scroll: false })
    } else if (action === 'withdraw') {
      if (canDeposit) setWithdrawOpen(true)
      router.replace(ROUTES.dashboard.wallet, { scroll: false })
    }
  }, [searchParams, router, canDeposit])

  const wallet = session?.wallet
  const pendingDeposit = sessionDeposits.find(
    (d) => d.status === 'UNDER_REVIEW' || d.status === 'PENDING' || d.status === 'NEED_INFO',
  )
  const pendingWithdraw = sessionWithdrawals.find(
    (w) => w.status === 'PENDING' || w.status === 'APPROVED',
  )
  const kycLocked = !canDeposit
  const balance = wallet?.availableBalance ?? DEMO_WALLET.availableBalance
  const invested = wallet?.investedAmount ?? DEMO_WALLET.investedAmount
  const pendingDepAmt = wallet?.pendingDeposit ?? DEMO_WALLET.pendingDeposit
  const pendingWdrAmt = wallet?.pendingWithdrawal ?? DEMO_WALLET.pendingWithdrawal

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6 lg:space-y-8">
      <PageHeader
        className="pb-2 sm:pb-4"
        title={cms?.title ?? 'Wallet'}
        description={
          cms?.helperText ??
          'Balances, pending money moves, and deposit or withdraw in a guided flow.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={kycLocked}
              onClick={tryWithdraw}
            >
              <ArrowUpFromLine aria-hidden />
              {cms?.withdrawCta ?? 'Withdraw'}
            </Button>
            <Button
              className="w-full shadow-glow sm:w-auto"
              disabled={kycLocked}
              onClick={tryDeposit}
            >
              <ArrowDownToLine aria-hidden />
              {cms?.depositCta ?? 'Deposit'}
            </Button>
          </>
        }
      />

      {kycLocked ? (
        <Alert tone="warning" title={accountStatus.label}>
          {accountStatus.description}{' '}
          <Link href={accountStatus.nextActionHref} className="text-accent-300 underline-offset-4 hover:underline">
            {accountStatus.nextActionLabel}
          </Link>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Available balance"
          icon={Wallet}
          value={<Money value={balance as typeof DEMO_WALLET.availableBalance} />}
          hint="Spendable after pending locks."
        />
        <StatCard
          label="Invested"
          icon={Landmark}
          value={<Money value={invested as typeof DEMO_WALLET.investedAmount} />}
        />
        <StatCard
          label="Pending deposit"
          value={<Money value={pendingDepAmt as typeof DEMO_WALLET.pendingDeposit} />}
        />
        <StatCard
          label="Pending withdrawal"
          value={<Money value={pendingWdrAmt as typeof DEMO_WALLET.pendingWithdrawal} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card variant="glass" className="relative overflow-hidden p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-accent-500/15 blur-3xl"
            aria-hidden
          />
          <SectionHeader
            title="Move money"
            description="Modal workflows — no separate deposit or withdraw pages."
            as="h3"
          />
          <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={tryDeposit}
              disabled={kycLocked}
              className="flex flex-col gap-2 rounded-2xl border border-accent-700/40 bg-accent-500/10 p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-accent-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent-500/20 text-accent-200">
                <ArrowDownToLine className="size-5" aria-hidden />
              </span>
              <span className="text-body font-medium text-fg">
                {kycLocked ? accountStatus.nextActionLabel : 'Deposit'}
              </span>
              <span className="text-caption text-fg-muted">INR UPI / IMPS or crypto</span>
            </button>
            <button
              type="button"
              onClick={tryWithdraw}
              disabled={kycLocked}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-inset/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:bg-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-hover text-fg-muted">
                <ArrowUpFromLine className="size-5" aria-hidden />
              </span>
              <span className="text-body font-medium text-fg">Withdraw</span>
              <span className="text-caption text-fg-muted">Bank or crypto wallet</span>
            </button>
          </div>
        </Card>

        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="Pending activity"
            description="Live status while ops reviews money moves."
            as="h3"
          />
          <div className="mt-5 space-y-4">
            {pendingDeposit ? (
              <div className="rounded-xl border border-info/30 bg-info/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{pendingDeposit.id}</p>
                  <StatusPill status={pendingDeposit.status} />
                </div>
                <p className="mt-1 text-caption text-fg-muted">
                  <Money value={pendingDeposit.amount as typeof DEMO_WALLET.availableBalance} /> ·{' '}
                  {pendingDeposit.method}
                </p>
                <div className="mt-4">
                  <StatusTimeline
                    steps={
                      pendingDeposit.timeline?.length
                        ? pendingDeposit.timeline.map((s) => ({ id: s.id, label: s.label }))
                        : WALLET_DEPOSIT_TIMELINE
                    }
                    activeIndex={
                      pendingDeposit.timeline?.findIndex((s) => s.current) ?? 3
                    }
                  />
                </div>
              </div>
            ) : null}
            {pendingWithdraw ? (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{pendingWithdraw.id}</p>
                  <StatusPill status={pendingWithdraw.status} />
                </div>
                <p className="mt-1 text-caption text-fg-muted">
                  <Money value={pendingWithdraw.amount as typeof DEMO_WALLET.availableBalance} /> ·{' '}
                  {pendingWithdraw.destination}
                </p>
              </div>
            ) : null}
            {!pendingDeposit && !pendingWithdraw ? (
              <p className="text-body-sm text-fg-subtle">No pending deposits or withdrawals.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader
            title="Recent deposits"
            as="h3"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard.transactions}>
                  <Receipt aria-hidden />
                  Ledger
                </Link>
              </Button>
            }
          />
          {sessionDeposits.length === 0 ? (
            <PremiumEmptyState
              className="py-8"
              variant="wallet"
              title="No deposits yet"
              description="Fund your wallet to start earning daily returns."
              action={
                canDeposit ? (
                  <Button size="sm" onClick={tryDeposit}>
                    <ArrowDownToLine aria-hidden />
                    Deposit
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {sessionDeposits.slice(0, 4).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-fg">{row.id}</p>
                    <p className="text-caption text-fg-subtle">{formatDateTime(row.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money value={row.amount as typeof DEMO_WALLET.availableBalance} className="text-body-sm" />
                    <StatusPill status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Recent withdrawals" as="h3" />
          {sessionWithdrawals.length === 0 ? (
            <PremiumEmptyState
              className="py-8"
              variant="wallet"
              title="No withdrawals yet"
              description="Approved withdrawals appear here with transfer status."
            />
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {sessionWithdrawals.slice(0, 4).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-fg">{row.id}</p>
                    <p className="text-caption text-fg-subtle">{formatDateTime(row.requestedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money value={row.amount as typeof DEMO_WALLET.availableBalance} className="text-body-sm" />
                    <StatusPill status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </div>
  )
}
