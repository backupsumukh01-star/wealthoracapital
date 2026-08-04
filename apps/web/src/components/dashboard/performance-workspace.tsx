'use client'

import { Download, FileSpreadsheet, FileText, Trophy } from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Percent } from '@/components/common/percent'
import { StatCard } from '@/components/common/stat-card'
import { LivePerformanceChart } from '@/components/dashboard/live-performance-chart'
import { PerformanceCalendar } from '@/components/dashboard/performance-calendar'
import { PortfolioAllocation } from '@/components/dashboard/portfolio-allocation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { DEMO_WALLET, PERFORMANCE_SUMMARY } from '@/lib/dashboard-data'
import { DEMO_DAILY_RETURNS, DEMO_MONTHLY_RETURNS } from '@/lib/investor-demo-data'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

function exportCsvStub() {
  const header = 'date,type,return_pct,profit\n'
  const rows = DEMO_DAILY_RETURNS.map(
    (d) => `${d.date},daily,${d.returnPct},${d.profit}`,
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'growzy-performance-demo.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV downloaded (demo)')
}

export function PerformanceWorkspace() {
  const winRate = PERFORMANCE_SUMMARY.winRatePct
  const { ready, state } = useAdminOs()
  const cms = ready ? state.platformCms.performance : null

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title={cms?.title ?? 'Portfolio performance'}
        description={
          cms?.disclaimer ??
          'Equity curve, daily and monthly returns — the story of your capital.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast.info('PDF export is a UI preview — wire to API later.')}
            >
              <FileText aria-hidden />
              Export PDF
            </Button>
            <Button variant="secondary" onClick={exportCsvStub}>
              <FileSpreadsheet aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime return"
          value={<Percent value={DEMO_WALLET.totalRoiPct} showArrow />}
          hint="Compounded across every day you held a balance."
        />
        <StatCard
          label="This month"
          value={<Percent value={DEMO_WALLET.monthlyReturnPct} showArrow />}
        />
        <StatCard
          label="Win rate"
          icon={Trophy}
          value={<span className="text-stat-lg tabular-nums text-fg">{winRate}%</span>}
          hint="Share of trading days with a positive credit."
        />
        <StatCard
          label="Best day"
          value={<Percent value={PERFORMANCE_SUMMARY.bestDay.returnPct} showArrow />}
          delta={
            <span>
              {formatDate(PERFORMANCE_SUMMARY.bestDay.date)} ·{' '}
              <Money value={PERFORMANCE_SUMMARY.bestDay.profit} size="sm" />
            </span>
          }
        />
      </div>

      <LivePerformanceChart />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Monthly returns" as="h3" description="Calendar months this year." />
          <ul className="mt-4 space-y-1">
            {DEMO_MONTHLY_RETURNS.map((row) => {
              const positive = Number(row.returnPct) >= 0
              return (
                <li
                  key={row.month}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-hover/40"
                >
                  <span className="text-body-sm text-fg-muted">{row.month} 2026</span>
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
        </Card>
        <PortfolioAllocation />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Daily returns" as="h3" description="Most recent settlements." />
          <ul className="mt-4 space-y-1">
            {DEMO_DAILY_RETURNS.map((row) => {
              const positive = Number(row.returnPct) >= 0
              return (
                <li
                  key={row.date}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-hover/40"
                >
                  <span className="text-body-sm text-fg-muted">{formatDate(row.date)}</span>
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
        </Card>
        <PerformanceCalendar />
      </div>

      <Card variant="glass" className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-body font-medium text-fg">Need a full statement?</p>
          <p className="text-body-sm text-fg-muted">
            PDF and CSV exports use demo data until the reporting API is connected.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsvStub}>
          <Download aria-hidden />
          Download statement CSV
        </Button>
      </Card>
    </div>
  )
}
