'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Sparkles } from 'lucide-react'

import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useWalletSummary } from '@/features/wallet/hooks'
import { useDisplayCurrency } from '@/hooks/use-display-currency'
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { useSession } from '@/providers/session-provider'

/** Highlights capital currently participating in the programme. */
export function ActiveInvestmentCard() {
  const { session } = useSession()
  const { data: summary } = useWalletSummary({ enabled: Boolean(session) })
  const { convertFromUsd } = useExchangeRate({ enabled: Boolean(session) })
  const { displayCurrency } = useDisplayCurrency({ enabled: Boolean(session) })
  const wallet = summary?.wallet ?? session?.wallet
  const investedAmount = wallet?.investedAmount ?? '0.00'
  const totalProfit = wallet?.totalProfit ?? '0.00'
  const availableBalance = wallet?.availableBalance ?? '0.00'
  const investedDisplay =
    displayCurrency === 'USD' ? null : convertFromUsd(investedAmount, displayCurrency)
  const todayReturnPct = summary?.today.returnPct ?? '0.00'
  const totalRoiPct =
    wallet && Number(wallet.totalDeposited) > 0
      ? ((Number(wallet.totalProfit) / Number(wallet.totalDeposited)) * 100).toFixed(2)
      : '0.00'
  const invested = Number(investedAmount)
  const profit = Number(totalProfit)
  const progress = Math.min(100, Math.round((profit / Math.max(invested, 1)) * 100 * 4))

  return (
    <Card variant="glass" className="relative overflow-hidden border-accent-700/30 p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent-500/15 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-overline text-accent-300">
            <Sparkles className="size-3.5" aria-hidden />
            Active investment
          </p>
          <p className="mt-2 text-stat-lg tabular-nums text-fg">
            <Money value={investedAmount} />
          </p>
          {investedDisplay ? (
            <p className="mt-0.5 text-caption text-fg-subtle tabular-nums">
              ≈ <Money value={investedDisplay} currency={displayCurrency} size="inherit" />
            </p>
          ) : null}
          <p className="mt-1 text-body-sm text-fg-muted">
            Today <Percent value={todayReturnPct} className="text-profit" />
          </p>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href={ROUTES.dashboard.performance}>
            View performance
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="relative mt-5 space-y-2">
        <div className="flex justify-between text-caption text-fg-subtle">
          <span>Lifetime ROI</span>
          <span className="tabular-nums text-accent-200">{totalRoiPct}%</span>
        </div>
        <Progress value={progress} tone="profit" className="h-2" />
        <p className="text-caption text-fg-subtle">
          Total profit <Money value={totalProfit} className="text-profit" /> · Available{' '}
          <Money value={availableBalance} />
        </p>
      </div>
    </Card>
  )
}
