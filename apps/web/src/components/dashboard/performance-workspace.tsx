'use client'

import { FileSpreadsheet, FileText, Trophy } from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Percent } from '@/components/common/percent'
import { StatCard } from '@/components/common/stat-card'
import { LivePerformanceChart } from '@/components/dashboard/live-performance-chart'
import { PortfolioAllocation } from '@/components/dashboard/portfolio-allocation'
import { UserAnalyticsCharts } from '@/components/dashboard/user-analytics-charts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import {
  usePerformanceDistributions,
  usePerformanceMonthly,
  usePerformanceSummary,
} from '@/features/performance/hooks'
import { useWalletSummary } from '@/features/wallet/hooks'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

function exportCsv(rows: { date: string; returnPct: string; profit: string }[]) {
  const header = 'date,type,return_pct,profit\n'
  const body = rows.map((d) => `${d.date},daily,${d.returnPct},${d.profit}`).join('\n')
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'growzy-performance.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV downloaded')
}

export function PerformanceWorkspace() {
  const { session } = useSession()
  const enabled = Boolean(session)
  const { data: summary } = usePerformanceSummary({ enabled })
  const { data: walletSummary } = useWalletSummary({ enabled })
  const { data: monthly } = usePerformanceMonthly({ enabled })
  const { data: distributions } = usePerformanceDistributions({ enabled })

  const wallet = walletSummary?.wallet ?? session?.wallet
  const dailyReturns = (distributions?.items ?? []).slice(0, 10).map((d) => ({
    date: d.date,
    returnPct: d.returnPct,
    profit: d.amount,
  }))

  const monthlyReturns = (monthly ?? []).map((m) => ({
    month: m.month,
    returnPct: m.returnPct,
    profit: m.profit,
  }))

  const totalRoiPct = summary?.roiPct
    ?? (wallet && Number(wallet.totalDeposited) > 0
      ? ((Number(wallet.totalProfit) / Number(wallet.totalDeposited)) * 100).toFixed(2)
      : '0.00')
  const monthlyReturnPct = summary?.thisMonthReturnPct ?? monthlyReturns[0]?.returnPct ?? '0.00'
  const winRate = summary?.winRatePct ? Number(summary.winRatePct).toFixed(1) : '0.0'
  const bestDay = summary?.bestDay
    ? {
        date: summary.bestDay.date,
        returnPct: summary.bestDay.returnPct,
        profit: summary.bestDay.profit,
      }
    : dailyReturns.reduce<{ date: string; returnPct: string; profit: string } | null>(
        (best, row) => (!best || Number(row.returnPct) > Number(best.returnPct) ? row : best),
        null,
      )

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Portfolio performance"
        description="Equity curve, daily and monthly returns — the story of your capital."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast.info('PDF export is coming soon.')}
            >
              <FileText aria-hidden />
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportCsv(dailyReturns)} disabled={!dailyReturns.length}>
              <FileSpreadsheet aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime return"
          value={<Percent value={totalRoiPct} showArrow />}
          hint="Compounded across every day you held a balance."
        />
        <StatCard
          label="This month"
          value={<Percent value={monthlyReturnPct} showArrow />}
        />
        <StatCard
          label="Win rate"
          icon={Trophy}
          value={<span className="text-stat-lg tabular-nums text-fg">{winRate}%</span>}
          hint="Share of trading days with a positive credit."
        />
        <StatCard
          label="Best day"
          value={<Percent value={bestDay?.returnPct ?? '0.00'} showArrow />}
          delta={
            bestDay ? (
              <span>
                {formatDate(bestDay.date)} · <Money value={bestDay.profit} size="sm" />
              </span>
            ) : (
              <span className="text-fg-subtle">No settlements yet</span>
            )
          }
        />
      </div>

      <LivePerformanceChart />

      <UserAnalyticsCharts />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Monthly returns" as="h3" description="Calendar months this year." />
          {monthlyReturns.length === 0 ? (
            <p className="mt-4 text-body-sm text-fg-subtle">No published returns yet.</p>
          ) : (
            <ul className="mt-4 space-y-1">
              {monthlyReturns.map((row) => {
                const positive = Number(row.returnPct) >= 0
                return (
                  <li
                    key={row.month}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-hover/40"
                  >
                    <span className="text-body-sm text-fg-muted">{row.month}</span>
                    <span className="flex items-center gap-4">
                      <Money
                        value={row.profit}
                        signed
                        className={cn('text-body-sm', positive ? 'text-profit' : 'text-loss')}
                      />
                      <Percent
                        value={row.returnPct}
                        className={cn(
                          'w-16 text-right text-body-sm',
                          positive ? 'text-profit' : 'text-loss',
                        )}
                      />
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <PortfolioAllocation />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Daily returns" as="h3" description="Most recent settlements." />
          {dailyReturns.length === 0 ? (
            <p className="mt-4 text-body-sm text-fg-subtle">No daily settlements yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {dailyReturns.map((row) => (
                <li key={row.date} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-body-sm text-fg-muted">{formatDate(row.date)}</span>
                  <span className="flex items-center gap-4">
                    <Money value={row.profit} signed className="text-body-sm" />
                    <Percent value={row.returnPct} showArrow className="text-body-sm" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Wallet totals" as="h3" />
          <ul className="mt-4 space-y-3 text-body-sm">
            <li className="flex justify-between gap-3">
              <span className="text-fg-muted">Total profit</span>
              <Money value={wallet?.totalProfit ?? '0.00'} signed />
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-fg-muted">Invested</span>
              <Money value={wallet?.investedAmount ?? '0.00'} />
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-fg-muted">Available</span>
              <Money value={wallet?.availableBalance ?? '0.00'} />
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
