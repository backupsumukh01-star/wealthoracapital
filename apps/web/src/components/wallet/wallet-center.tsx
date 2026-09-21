'use client'

import { useEffect } from 'react'
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

import { DualMoney } from '@/components/common/dual-money'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { useDeposits } from '@/features/deposits/hooks'
import { useWallet } from '@/features/wallet/hooks'
import { useWithdrawals } from '@/features/withdrawals/hooks'
import { accountAccessMessage, canTransact } from '@/lib/account-access'
import { formatDateTime } from '@/lib/format'
import { useCmsBootstrap } from '@/features/cms/hooks'
import { useSession } from '@/providers/session-provider'

export function WalletCenter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { session } = useSession()
  const allowed = canTransact(session?.user.kycStatus)
  const access = accountAccessMessage(session?.user.kycStatus)
  const { data: wallet } = useWallet({ enabled: Boolean(session) })
  const { data: depositsData } = useDeposits(undefined, { enabled: Boolean(session) })
  const { data: withdrawalsData } = useWithdrawals(undefined, { enabled: Boolean(session) })
  const deposits = depositsData?.items ?? []
  const withdrawals = withdrawalsData?.items ?? []
  const { data: cmsBoot, isSuccess: cmsReady } = useCmsBootstrap()
  const cms = cmsReady ? cmsBoot?.platform.wallet : null

  function tryDeposit() {
    if (!allowed) return
    router.push(ROUTES.dashboard.deposit)
  }

  function tryWithdraw() {
    if (!allowed) return
    router.push(ROUTES.dashboard.withdraw)
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'deposit') {
      router.replace(ROUTES.dashboard.deposit)
    } else if (action === 'withdraw') {
      router.replace(ROUTES.dashboard.withdraw)
    }
  }, [searchParams, router])

  const pendingDeposit = deposits.find(
    (d) => d.status === 'UNDER_REVIEW' || d.status === 'PENDING',
  )
  const pendingWithdraw = withdrawals.find(
    (w) => w.status === 'PENDING' || w.status === 'APPROVED' || w.status === 'PROCESSING',
  )
  const kycLocked = !allowed
  const balance = wallet?.availableBalance ?? '0.00'
  const invested = wallet?.investedAmount ?? '0.00'
  const pendingDepAmt = pendingDeposit?.amount ?? '0.00'
  const pendingWdrAmt = wallet?.lockedBalance ?? '0.00'

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6 lg:space-y-8">
      <PageHeader
        className="pb-2 sm:pb-4"
        title={cms?.title ?? 'Wallet'}
        description={
          cms?.helperText ??
          'Balances, pending money moves and a guided deposit or withdrawal flow.'
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
        <Alert tone="warning" title={access.label}>
          {access.description}{' '}
          <Link href={access.nextActionHref} className="text-accent-300 underline-offset-4 hover:underline">
            {access.nextActionLabel}
          </Link>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Available balance"
          icon={Wallet}
          value={<Money value={balance} />}
          hint="Spendable after pending locks."
        />
        <StatCard
          label="Invested"
          icon={Landmark}
          value={<Money value={invested} />}
        />
        <StatCard
          label="Pending deposit"
          value={<Money value={pendingDepAmt} />}
        />
        <StatCard
          label="Pending withdrawal"
          value={<Money value={pendingWdrAmt} />}
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
                {kycLocked ? access.nextActionLabel : 'Deposit'}
              </span>
              <span className="text-caption text-fg-muted">Bank, UPI, or crypto</span>
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
                  <p className="text-body-sm font-medium text-fg">{pendingDeposit.reference}</p>
                  <StatusPill status={pendingDeposit.status} />
                </div>
                <p className="mt-1 text-caption text-fg-muted">
                  <DualMoney
                    usd={pendingDeposit.amount}
                    inr={pendingDeposit.amountInr ?? pendingDeposit.depositInr}
                  />{' '}
                  · {pendingDeposit.method?.name ?? 'Deposit'}
                </p>
              </div>
            ) : null}
            {pendingWithdraw ? (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{pendingWithdraw.reference}</p>
                  <StatusPill status={pendingWithdraw.status} />
                </div>
                <p className="mt-1 text-caption text-fg-muted">
                  <DualMoney
                    usd={pendingWithdraw.amount}
                    inr={pendingWithdraw.amountInr ?? pendingWithdraw.withdrawInr}
                  />
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
          {deposits.length === 0 ? (
            <PremiumEmptyState
              className="py-8"
              variant="wallet"
              title="No deposits yet"
              description="Fund your wallet to start receiving published daily returns."
              action={
                allowed ? (
                  <Button size="sm" onClick={tryDeposit}>
                    <ArrowDownToLine aria-hidden />
                    Deposit
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {deposits.slice(0, 4).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-fg">{row.reference}</p>
                    <p className="text-caption text-fg-subtle">{formatDateTime(row.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DualMoney
                      usd={row.amount}
                      inr={row.amountInr ?? row.depositInr}
                      className="text-body-sm"
                    />
                    <StatusPill status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Recent withdrawals" as="h3" />
          {withdrawals.length === 0 ? (
            <PremiumEmptyState
              className="py-8"
              variant="wallet"
              title="No withdrawals yet"
              description="Approved withdrawals appear here with transfer status."
            />
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {withdrawals.slice(0, 4).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-fg">{row.reference}</p>
                    <p className="text-caption text-fg-subtle">{formatDateTime(row.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DualMoney
                      usd={row.amount}
                      inr={row.amountInr ?? row.withdrawInr}
                      className="text-body-sm"
                    />
                    <StatusPill status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
