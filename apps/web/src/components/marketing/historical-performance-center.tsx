'use client'

import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'

import { Section } from '@/components/common/section'
import { SectionHeader } from '@/components/common/page-header'
import { HpcCharts } from '@/components/marketing/hpc-charts'
import { HistoricalNote } from '@/components/marketing/historical-note'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { CountUp } from '@/components/motion/count-up'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useDemoDailyReturns,
  useDemoDashboardStats,
  useDemoMonthlyReturns,
  useDemoReportCatalog,
  useDemoTrades,
  type DemoTrade,
} from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'

const TRADE_PAGE_SIZE = 25
const DAY_PAGE_SIZE = 20

function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

function StatTiles() {
  const { data: stats, isLoading, isError } = useDemoDashboardStats()

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (isError || !stats) {
    return <p className="text-body-sm text-fg-subtle">Dashboard stats failed to load.</p>
  }

  const tiles = [
    { label: 'Trading days', value: stats.tradingDayCount, decimals: 0, suffix: '' },
    { label: 'Trades', value: stats.tradeCount, decimals: 0, suffix: '' },
    { label: 'Win rate', value: stats.winRatePct, decimals: 1, suffix: '%' },
    { label: 'Positive days', value: stats.positiveDayPct, decimals: 1, suffix: '%' },
    { label: 'Avg monthly', value: stats.avgMonthlyReturnPct, decimals: 1, suffix: '%' },
    {
      label: 'Months in 5–10% band',
      value: stats.monthsInBand,
      decimals: 0,
      suffix: ` / ${stats.monthCount}`,
    },
    { label: 'Total return', value: stats.totalReturnPct, decimals: 1, suffix: '%' },
    { label: 'Ending equity', value: stats.endingEquity, decimals: 1, suffix: '' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <RevealOnScroll key={t.label}>
          <div className="card-fill p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">{t.label}</p>
            <p className="mt-2 text-stat-md tabular-nums text-fg">
              <CountUp value={String(t.value)} decimals={t.decimals} suffix={t.suffix} />
            </p>
          </div>
        </RevealOnScroll>
      ))}
      <RevealOnScroll className="sm:col-span-2 lg:col-span-4">
        <div className="flex flex-wrap gap-3 text-caption text-fg-muted">
          <span>
            Best day {stats.bestDay.date}:{' '}
            <span className="tabular-nums text-profit">{formatPct(stats.bestDay.returnPct, 3)}</span>
          </span>
          <span className="text-fg-subtle">·</span>
          <span>
            Worst day {stats.worstDay.date}:{' '}
            <span className="tabular-nums text-loss">{formatPct(stats.worstDay.returnPct, 3)}</span>
          </span>
        </div>
      </RevealOnScroll>
    </div>
  )
}

function MonthlyTable() {
  const { data: months = [], isLoading } = useDemoMonthlyReturns()

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="card-fill overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">Return</TableHead>
            <TableHead className="text-right">Days</TableHead>
            <TableHead className="text-right">5–10% band</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...months].reverse().map((m) => (
            <TableRow key={m.yearMonth}>
              <TableCell className="font-medium">{m.label}</TableCell>
              <TableCell className="text-right tabular-nums text-profit">
                {formatPct(m.returnPct)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-fg-muted">{m.tradingDays}</TableCell>
              <TableCell className="text-right">
                <Badge tone={m.inPresentationBand ? 'success' : 'warning'} size="sm">
                  {m.inPresentationBand ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DailyTable() {
  const { data: days = [], isLoading } = useDemoDailyReturns()
  const [page, setPage] = useState(0)
  const ordered = useMemo(() => [...days].reverse(), [days])
  const pageCount = Math.max(1, Math.ceil(ordered.length / DAY_PAGE_SIZE))
  const slice = ordered.slice(page * DAY_PAGE_SIZE, page * DAY_PAGE_SIZE + DAY_PAGE_SIZE)

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-3">
      <div className="card-fill overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Net return</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="hidden sm:table-cell">Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium tabular-nums">{d.date}</TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    d.netReturnPct >= 0 ? 'text-profit' : 'text-loss',
                  )}
                >
                  {formatPct(d.netReturnPct, 3)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-fg-muted">
                  {d.tradeCount}
                </TableCell>
                <TableCell className="hidden max-w-md truncate text-fg-muted sm:table-cell">
                  {d.summary}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  )
}

function TradesTable() {
  const { data: trades = [], isLoading } = useDemoTrades()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...trades].reverse()
    if (!q) return list
    return list.filter(
      (t) =>
        t.reference.toLowerCase().includes(q) ||
        t.pair.toLowerCase().includes(q) ||
        t.strategy.toLowerCase().includes(q) ||
        t.tradeDate.includes(q),
    )
  }, [trades, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / TRADE_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = filtered.slice(safePage * TRADE_PAGE_SIZE, safePage * TRADE_PAGE_SIZE + TRADE_PAGE_SIZE)

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          placeholder="Search pair, strategy, date, or reference"
          className="pl-9"
          aria-label="Filter trades"
        />
      </div>
      <div className="card-fill overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead className="hidden md:table-cell">Strategy</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((t: DemoTrade) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-caption text-fg-muted">{t.reference}</TableCell>
                <TableCell className="tabular-nums">{t.tradeDate}</TableCell>
                <TableCell className="font-medium">{t.pair}</TableCell>
                <TableCell className="hidden text-fg-muted md:table-cell">{t.strategy}</TableCell>
                <TableCell>
                  <Badge tone={t.direction === 'BUY' ? 'info' : 'neutral'} size="sm">
                    {t.direction}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    t.returnPct >= 0 ? 'text-profit' : 'text-loss',
                  )}
                >
                  {formatPct(t.returnPct, 3)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge tone={t.outcome === 'WIN' ? 'profit' : 'loss'} size="sm">
                    {t.outcome}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-fg-subtle">
          Showing {slice.length} of {filtered.length.toLocaleString()} trades
        </p>
        <Pager page={safePage} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  )
}

function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="glass"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-caption tabular-nums text-fg-subtle">
        {page + 1} / {pageCount}
      </span>
      <Button
        type="button"
        size="sm"
        variant="glass"
        disabled={page >= pageCount - 1}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}

function ReportDownloads() {
  const { data, isLoading, isError } = useDemoReportCatalog()

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    )
  }

  if (isError || !data?.reports?.length) {
    return <p className="text-caption text-fg-subtle">No demo reports available.</p>
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.reports.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div>
            <p className="text-caption uppercase tracking-wider text-fg-subtle">{doc.format}</p>
            <h3 className="mt-1 text-body-sm font-medium text-fg">{doc.title}</h3>
            <p className="mt-1 text-caption text-fg-muted">{doc.description}</p>
          </div>
          <div className="mt-3">
            <Button asChild size="sm" variant="glass">
              <a href={doc.href} target="_blank" rel="noreferrer" download={doc.fileName}>
                <Download aria-hidden />
                Download
              </a>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Historical Performance Center — explores the synthetic 3-year demo/backtest dataset
 * served from `/demo/backtest/*.json`. Demo only; not live trading history.
 */
export function HistoricalPerformanceCenter() {
  return (
    <>
      <Section
        id="hpc-overview"
        eyebrow="Overview"
        title="Headline statistics"
        description="Aggregates from the reproducible 3-year synthetic backtest (seed growzy-3y-backtest-v1)."
        backdrop="glow"
      >
        <StatTiles />
        <HistoricalNote className="mt-6" />
      </Section>

      <Section
        id="hpc-charts"
        eyebrow="Charts"
        title="Equity, months, and daily settles"
        description="Interactive views of the same JSON the desk uses for walkthroughs."
      >
        <HpcCharts />
      </Section>

      <Section
        id="hpc-ledger"
        eyebrow="Ledger"
        title="Inspect the synthetic book"
        description="Monthly compounds, daily settlements, and closed tickets — all client-side from public demo files."
      >
        <Tabs defaultValue="monthly" className="min-w-0">
          <TabsList aria-label="Historical performance tables">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" className="mt-4">
            <SectionHeader
              title="Monthly returns"
              description="Every calendar month in the demo window."
              as="h3"
            />
            <MonthlyTable />
          </TabsContent>
          <TabsContent value="daily" className="mt-4">
            <SectionHeader
              title="Daily returns"
              description="Published settlement days, newest first."
              as="h3"
            />
            <DailyTable />
          </TabsContent>
          <TabsContent value="trades" className="mt-4">
            <SectionHeader
              title="Trade blotter"
              description="Searchable closed tickets from the demo engine."
              as="h3"
            />
            <TradesTable />
          </TabsContent>
        </Tabs>
      </Section>

      <Section
        id="hpc-reports"
        eyebrow="Reports"
        title="Downloadable summaries"
        description="HTML and PDF snapshots mirrored into the public demo folder."
      >
        <ReportDownloads />
        <p className="mt-4 text-caption text-fg-subtle">
          Regenerated by <code>node demo-data/3-year-backtest/generate.mjs</code> — synthetic
          presentation data only. Do not treat as live performance.
        </p>
      </Section>
    </>
  )
}
