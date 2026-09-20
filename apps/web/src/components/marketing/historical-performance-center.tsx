'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Download, Eye, Search } from 'lucide-react'

import { Section } from '@/components/common/section'
import { SectionHeader } from '@/components/common/page-header'
import { HpcCharts } from '@/components/marketing/hpc-charts'
import { HistoricalNote } from '@/components/marketing/historical-note'
import { ReportPreviewModal } from '@/components/marketing/report-preview-modal'
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
import { useHpcDeskMetrics, useHpcMonthlySeries, useHpcProgrammeStats, useHpcTrades, type HpcTradeRow } from '@/features/hpc/use-hpc-data'
import { useLandingYearlySeries } from '@/features/landing'
import { buildGrowthOf100Rows } from '@/features/landing/live-stats'
import { usePublicPerformance } from '@/features/performance/hooks'
import { useDemoReportCatalog } from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'

function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

function StatTiles() {
  const { stats, isLoading, isReady } = useHpcProgrammeStats()
  const { data: pub } = usePublicPerformance()
  const meta = pub?.meta

  if (isLoading && !isReady) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  const hasHistory =
    stats.tradingDays !== '—' ||
    stats.monthCount !== '—' ||
    (meta?.tradingDayCount ?? 0) > 0

  if (!hasHistory && !isLoading) {
    return (
      <p className="text-body-sm text-fg-muted">No historical performance data available.</p>
    )
  }

  const endingFromGrowth =
    stats.totalReturn !== '—'
      ? String((100 + Number.parseFloat(stats.totalReturn)).toFixed(1))
      : null

  const endingEquity =
    endingFromGrowth ??
    (meta?.endingEquity && Number(meta.endingEquity) > 0 ? meta.endingEquity : null)

  const maxDd =
    meta?.maxDrawdownPct && Number(meta.maxDrawdownPct) > 0 ? meta.maxDrawdownPct : null

  const simpleAnnualizedValue = stats.yearlyReturn !== '—' ? stats.yearlyReturn : null

  const tiles = [
    { label: 'Trading days', value: stats.tradingDays, decimals: 0, suffix: '' },
    { label: 'Trades', value: stats.trades, decimals: 0, suffix: '' },
    { label: 'Win rate', value: stats.winRate, decimals: 1, suffix: '%' },
    { label: 'Average monthly return', value: stats.avgMonthlyReturn, decimals: 1, suffix: '%' },
    { label: 'Best day', value: stats.bestDay, decimals: 1, suffix: '%' },
    {
      label: 'Worst day',
      value: stats.worstDayAbs,
      decimals: 1,
      suffix: '%',
      loss: true,
    },
    { label: 'Years of performance', value: stats.yearsOfPerformance, decimals: 0, suffix: '' },
    { label: 'Months', value: stats.monthCount, decimals: 0, suffix: '' },
    { label: 'Total return', value: stats.totalReturn, decimals: 0, suffix: '%' },
    {
      label: 'Ending equity',
      value: endingEquity ?? '—',
      decimals: 1,
      suffix: '',
    },
    {
      label: 'Annualized simple return',
      value: simpleAnnualizedValue ?? '—',
      decimals: 1,
      suffix: simpleAnnualizedValue ? '%' : '',
    },
    {
      label: 'Max drawdown',
      value: maxDd ?? '—',
      decimals: 1,
      suffix: maxDd ? '%' : '',
      loss: Boolean(maxDd),
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <RevealOnScroll key={t.label}>
          <div className="card-fill flex h-full flex-col p-4 sm:p-5">
            <p className="text-caption text-fg-subtle">{t.label}</p>
            <p
              className={cn(
                'mt-2 text-stat-md tabular-nums',
                t.loss ? 'text-loss' : 'text-fg',
              )}
            >
              <CountUp
                value={String(t.value)}
                decimals={t.decimals}
                prefix={t.loss ? '−' : ''}
                suffix={t.suffix}
              />
            </p>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  )
}

function MonthlyTable() {
  const { data: months = [], isLoading } = useHpcMonthlySeries()
  const [open, setOpen] = useState<string | null>(null)
  const rows = useMemo(() => {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month))
    return buildGrowthOf100Rows(chronological)
  }, [months])

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  if (rows.length === 0) {
    return (
      <p className="text-body-sm text-fg-muted">No historical performance data available.</p>
    )
  }

  return (
    <div className="card-fill overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Monthly Return</TableHead>
            <TableHead className="text-right">Simple Growth</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...rows].reverse().map((m) => {
            const isOpen = open === m.month
            const year = m.month.slice(0, 4)
            return (
              <TableRow
                key={m.month}
                className="cursor-pointer"
                onClick={() => setOpen(isOpen ? null : m.month)}
              >
                <TableCell className="font-medium">{m.label || m.month}</TableCell>
                <TableCell className="tabular-nums text-fg-muted">{year}</TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    m.returnPct >= 0 ? 'text-profit' : 'text-loss',
                  )}
                >
                  {formatPct(m.returnPct)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-fg">
                  ${m.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {open ? (
        <div className="border-t border-line px-4 py-3 text-caption text-fg-muted">
          Accumulated simple value for <span className="text-fg">{open}</span> is original principal
          plus cumulative monthly profit. Download the monthly PDF from the reports section for a
          printable pack.
        </div>
      ) : null}
    </div>
  )
}

function YearlyCards() {
  const yearly = useLandingYearlySeries()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {yearly.map((y) => (
        <div key={y.year} className="card-fill flex h-full flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-heading-sm text-fg">{y.year}</p>
            <p
              className={cn(
                'text-stat-md tabular-nums',
                y.returnPct >= 0 ? 'text-profit' : 'text-loss',
              )}
            >
              {y.returnPct >= 0 ? '+' : ''}
              {y.returnPct}%
            </p>
          </div>
          <ul className="mt-3 space-y-1 text-caption text-fg-muted">
            <li>Annual return: {formatPct(y.returnPct, 1)}</li>
            {y.tradeCount != null ? <li>Total trades: {y.tradeCount.toLocaleString()}</li> : null}
            {y.tradingDays != null ? <li>Trading days: {y.tradingDays}</li> : null}
            {y.winRatePct ? <li>Winning %: {y.winRatePct}%</li> : null}
            {y.profitLabel ? <li>{y.profitLabel}</li> : null}
          </ul>
        </div>
      ))}
    </div>
  )
}

function fmtMetricPct(n: number | null | undefined, digits = 2) {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatPct(n, digits)
}

function TradeStatsStrip() {
  const { metrics, isLoading } = useHpcDeskMetrics()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Win rate', value: `${metrics.winRatePct.toFixed(1)}%` },
    { label: 'Trade count', value: metrics.tradeCount.toLocaleString() },
    { label: 'Average return', value: fmtMetricPct(metrics.avgReturnPct, 3) },
    { label: 'Published trades', value: metrics.publishedTrades.toLocaleString() },
    { label: 'Largest win', value: fmtMetricPct(metrics.largestWinPct, 2) },
    { label: 'Largest loss', value: fmtMetricPct(metrics.largestLossPct, 2) },
    { label: 'Best month', value: fmtMetricPct(metrics.bestMonthPct, 1) },
    { label: 'Worst month', value: fmtMetricPct(metrics.worstMonthPct, 1) },
    { label: 'Avg monthly return', value: fmtMetricPct(metrics.avgMonthlyReturnPct, 2) },
    { label: 'Avg daily return', value: fmtMetricPct(metrics.avgDailyReturnPct, 3) },
    { label: 'Longest win streak', value: String(metrics.longestWinStreak) },
    { label: 'Longest loss streak', value: String(metrics.longestLossStreak) },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card-fill flex h-full min-w-0 flex-col p-3 sm:p-4">
          <p className="text-caption text-fg-subtle">{c.label}</p>
          <p className="mt-2 truncate text-body-sm font-medium tabular-nums text-fg">{c.value}</p>
        </div>
      ))}
    </div>
  )
}

type SortKey = 'date' | 'pair' | 'returnPct' | 'direction'
type SideFilter = 'ALL' | 'BUY' | 'SELL'
type OutcomeFilter = 'ALL' | 'WIN' | 'LOSS'

function TradesInfinite() {
  const {
    trades,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    needsMore,
  } = useHpcTrades()
  const [query, setQuery] = useState('')
  const [side, setSide] = useState<SideFilter>('ALL')
  const [outcome, setOutcome] = useState<OutcomeFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 40

  useEffect(() => {
    if (needsMore) void fetchNextPage()
  }, [needsMore, fetchNextPage])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = trades
    if (side !== 'ALL') rows = rows.filter((t) => t.direction === side)
    if (outcome !== 'ALL') {
      rows = rows.filter((t) =>
        outcome === 'WIN' ? t.returnPct > 0 || t.outcome === 'WIN' : t.returnPct < 0 || t.outcome === 'LOSS',
      )
    }
    if (q) {
      rows = rows.filter(
        (t) =>
          t.reference.toLowerCase().includes(q) ||
          t.pair.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          t.direction.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q),
      )
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'pair') cmp = a.pair.localeCompare(b.pair)
      else if (sortKey === 'direction') cmp = a.direction.localeCompare(b.direction)
      else cmp = a.returnPct - b.returnPct
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [trades, query, side, outcome, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const grouped = useMemo(() => {
    const map = new Map<string, HpcTradeRow[]>()
    for (const row of pageRows) {
      const list = map.get(row.monthKey) ?? []
      list.push(row)
      map.set(row.monthKey, list)
    }
    return [...map.entries()]
  }, [pageRows])

  useEffect(() => {
    setPage(1)
  }, [query, side, outcome, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />

  return (
    <div className="min-w-0 space-y-3">
      <TradeStatsStrip />
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pair, date, side or reference"
            className="pl-9"
            aria-label="Search trades"
          />
        </div>
        <select
          className="h-10 rounded-lg border border-line bg-inset px-3 text-caption text-fg"
          value={side}
          onChange={(e) => setSide(e.target.value as SideFilter)}
          aria-label="Filter by side"
        >
          <option value="ALL">All sides</option>
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        <select
          className="h-10 rounded-lg border border-line bg-inset px-3 text-caption text-fg"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}
          aria-label="Filter by outcome"
        >
          <option value="ALL">All outcomes</option>
          <option value="WIN">Wins</option>
          <option value="LOSS">Losses</option>
        </select>
      </div>

      <div className="card-fill max-w-full overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" className="font-medium" onClick={() => toggleSort('date')}>
                  Date {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="font-medium" onClick={() => toggleSort('pair')}>
                  Pair {sortKey === 'pair' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="font-medium" onClick={() => toggleSort('direction')}>
                  Buy/Sell {sortKey === 'direction' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Exit</TableHead>
              <TableHead className="text-right">
                <button type="button" className="font-medium" onClick={() => toggleSort('returnPct')}>
                  Return % {sortKey === 'returnPct' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-fg-muted">
                  No trades match these filters.
                </TableCell>
              </TableRow>
            ) : (
              grouped.map(([month, rows]) => (
                <Fragment key={`m-${month}`}>
                  <TableRow className="bg-white/[0.04]">
                    <TableCell colSpan={8} className="py-2 text-caption font-medium text-fg-subtle">
                      {rows[0]?.monthLabel ?? month}
                    </TableCell>
                  </TableRow>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">{row.date}</TableCell>
                      <TableCell className="font-medium">{row.pair}</TableCell>
                      <TableCell>
                        <Badge tone={row.direction === 'BUY' ? 'info' : 'neutral'} size="sm">
                          {row.direction === 'BUY' ? 'Buy' : row.direction === 'SELL' ? 'Sell' : row.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-fg-muted">
                        {row.entryPrice}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-fg-muted">
                        {row.exitPrice}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          row.returnPct >= 0 ? 'text-profit' : 'text-loss',
                        )}
                      >
                        {formatPct(row.returnPct, 3)}
                      </TableCell>
                      <TableCell>
                        <Badge tone="success" size="sm">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-[9rem] truncate text-caption text-fg-subtle md:table-cell">
                        {row.reference}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-caption text-fg-subtle">
          Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()} trades
          {filtered.length !== trades.length ? ` (filtered from ${trades.length.toLocaleString()})` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="glass"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-caption tabular-nums text-fg-subtle">
            Page {safePage} / {pageCount}
          </span>
          <Button
            type="button"
            size="sm"
            variant="glass"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
          {hasNextPage ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more from API'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ReportDownloads() {
  const { data, isLoading, isError } = useDemoReportCatalog()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const previewItems = useMemo(() => {
    if (!data) return []
    const fromReports = (data.reports ?? [])
      .filter((r) => r.previewUrl || r.href.endsWith('.html'))
      .map((r) => ({
        id: r.id,
        title: r.title.replace(/^Download\s+/i, ''),
        previewUrl: r.previewUrl || r.href.replace(/\.pdf$/i, '.html'),
        downloadUrl: r.href,
        fileName: r.fileName || r.href.split('/').pop() || 'report.pdf',
      }))
    const fromPreviews = (data.previews ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      previewUrl: p.href,
      downloadUrl: p.download,
      fileName: p.download.split('/').pop() || 'report.pdf',
    }))
    // Prefer unique by preview URL; recent previews then library order for carousel
    const map = new Map<string, (typeof fromReports)[number]>()
    for (const item of [...fromPreviews, ...fromReports]) {
      if (!map.has(item.previewUrl)) map.set(item.previewUrl, item)
    }
    return [...map.values()]
  }, [data])

  const openPreview = (id: string) => {
    setPreviewId(id)
    setPreviewOpen(true)
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    )
  }

  if (isError || !data?.reports?.length) {
    return <p className="text-caption text-fg-subtle">No reports available.</p>
  }

  return (
    <div className="space-y-8">
      <ReportPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        items={previewItems}
        initialId={previewId}
      />

      {data.previews?.length ? (
        <div>
          <h3 className="text-body-sm font-medium text-fg">Recent Reports</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {data.previews.map((p) => (
              <li
                key={p.id}
                className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-body-sm font-medium text-fg">{p.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="glass" onClick={() => openPreview(p.id)}>
                    <Eye aria-hidden />
                    Preview
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <a href={p.download} download>
                      <Download aria-hidden />
                      Download
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {data.reports.map((doc) => {
          const canPreview = Boolean(doc.previewUrl || doc.format !== 'csv')
          return (
            <li
              key={doc.id}
              className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div>
                <p className="text-caption uppercase tracking-wider text-fg-subtle">
                  {doc.category || doc.format}
                </p>
                <h3 className="mt-1 text-body-sm font-medium text-fg">{doc.title}</h3>
                <p className="mt-1 text-caption text-fg-muted">{doc.description}</p>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-start">
                {canPreview ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="glass"
                    className="w-full sm:w-auto"
                    onClick={() => openPreview(doc.id)}
                  >
                    <Eye aria-hidden />
                    Preview
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                  <a href={doc.href} download={doc.fileName}>
                    <Download aria-hidden />
                    Download
                  </a>
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Historical Performance Center — public API + seeded desk history.
 */
export function HistoricalPerformanceCenter() {
  return (
    <>
      <Section
        id="hpc-overview"
        eyebrow="Overview"
        title="Headline statistics"
        description="4-Year Verified Demo Backtest — figures from the published programme ledger."
        backdrop="glow"
      >
        <StatTiles />
        <HistoricalNote className="mt-6" />
      </Section>

      <Section
        id="hpc-charts"
        eyebrow="Charts"
        title="Equity, months and daily settles"
        description="Interactive views of the full multi-year history."
      >
        <HpcCharts />
      </Section>

      <Section
        id="hpc-years"
        eyebrow="Yearly"
        title="Yearly returns"
        description="Every available year with trades, days and win rate."
      >
        <YearlyCards />
      </Section>

      <Section
        id="hpc-ledger"
        eyebrow="Ledger"
        title="Inspect the book"
        description="Monthly simple returns and the full published trade blotter."
      >
        <Tabs defaultValue="monthly" className="min-w-0">
          <TabsList aria-label="Historical performance tables">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" className="mt-4">
            <SectionHeader
              title="Monthly returns"
              description="Every calendar month in the programme window."
              as="h3"
            />
            <MonthlyTable />
          </TabsContent>
          <TabsContent value="trades" className="mt-4">
            <SectionHeader
              title="Trade blotter"
              description="Search, filter, sort and paginate the full published desk history."
              as="h3"
            />
            <TradesInfinite />
          </TabsContent>
        </Tabs>
      </Section>

      <Section
        id="hpc-reports"
        eyebrow="Reports"
        title="Downloadable summaries"
        description="Daily, weekly, monthly, quarterly, yearly packs and the full trade export."
      >
        <ReportDownloads />
        <p className="mt-4 text-caption text-fg-subtle">
          Synthetic presentation data only. Do not treat as live verified trading history.
        </p>
      </Section>
    </>
  )
}
