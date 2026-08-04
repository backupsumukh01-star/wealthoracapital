'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Sparkles } from 'lucide-react'

import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DEMO_WALLET } from '@/lib/dashboard-data'

/** Highlights capital currently participating in the programme. */
export function ActiveInvestmentCard() {
  const invested = Number(DEMO_WALLET.investedAmount)
  const profit = Number(DEMO_WALLET.totalProfit)
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
            <Money value={DEMO_WALLET.investedAmount} />
          </p>
          <p className="mt-1 text-body-sm text-fg-muted">
            Growth plan · Today <Percent value={DEMO_WALLET.todayReturnPct} className="text-profit" />
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
          <span className="tabular-nums text-accent-200">{DEMO_WALLET.totalRoiPct}%</span>
        </div>
        <Progress value={progress} tone="profit" className="h-2" />
        <p className="text-caption text-fg-subtle">
          Total profit <Money value={DEMO_WALLET.totalProfit} className="text-profit" /> · Available{' '}
          <Money value={DEMO_WALLET.availableBalance} />
        </p>
      </div>
    </Card>
  )
}
