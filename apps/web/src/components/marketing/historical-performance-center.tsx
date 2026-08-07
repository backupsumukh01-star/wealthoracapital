'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useLandingLiveStats, useLandingMonthlySeries, useLandingYearlySeries } from '@/features/landing'
import { usePublicPerformance } from '@/features/performance/hooks'
import { usePublicTradeStats, usePublicTradesInfinite } from '@/features/trades/hooks'
import { useDemoReportCatalog } from '@/lib/demo-backtest'
import { cn } from '@/lib/cn'
import type { Trade } from '@meridian/shared'

type PublicTrade = Trade & { reference?: string; status?: string }

function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

function StatTiles() {
  const { stats, isLoading } = useLandingLiveStats()
  const { data: pub } = usePublicPerformance()
  const meta = pub?.meta

  if (isLoading && !meta) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  const tiles = [
    { label: 'Trading days', value: stats.tradingDays, decimals: 0, suffix: '' },
    { label: 'Trades', value: stats.trades, decimals: 0, suffix: '' },
    { label: 'Win rate', value: stats.winRate, decimals: 1, suffix: '%' },
    { label: 'Avg monthly', value: stats.avgMonthlyReturn, decimals: 1, suffix: '%' },
    { label: 'Total return', value: stats.totalReturn, decimals: 0, suffix: '%' },
    {
      label: 'Ending equity',
      value: meta?.endingEquity ?? '1355',
      decimals: 1,
      suffix: '',
    },
    { label: 'CAGR', value: meta?.cagrPct ?? stats.yearlyReturn, decimals: 1, suffix: '%' },
    {
      label: 'Max drawdown',
      value: meta?.maxDrawdownPct ?? '0',
      decimals: 1,
      suffix: '%',
      loss: true,
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
  const { data: months = [], isLoading } = useLandingMonthlySeries()
  const [open, setOpen] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="card-fill overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">Return</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...months].reverse().map((m) => {
            const isOpen = open === m.month
            return (
              <TableRow
                key={m.month}
                className="cursor-pointer"
                onClick={() => setOpen(isOpen ? null : m.month)}
              >
                <TableCell className="font-medium">{m.label || m.month}</TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    m.returnPct >= 0 ? 'text-profit' : 'text-loss',
                  )}
                >
                  {formatPct(m.returnPct)}
                </TableCell>
                <TableCell className="hidden text-right text-caption text-fg-subtle sm:table-cell">
                  {isOpen ? 'Hide' : 'Open'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {open ? (
        <div className="border-t border-line px-4 py-3 text-caption text-fg-muted">
          Detailed month report for <span className="text-fg">{open}</span>. Download the monthly
          PDF from the reports section for a printable pack.
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
            <li>{y.profitLabel}</li>
          </ul>
        </div>
      ))}
    </div>
  )
}

function TradeStatsStrip() {
  const { data: stats } = usePublicTradeStats()
  const { data: pub } = usePublicPerformance()
  const { data: monthly = [] } = useLandingMonthlySeries()
  const bestMonth = monthly.length
    ? Math.max(...monthly.map((m) => m.returnPct))
    : null
  const worstMonth = monthly.length
    ? Math.min(...monthly.map((m) => m.returnPct))
    : null

  const cards = [
    { label: 'Win rate', value: stats?.winRatePct ? `${Number(stats.winRatePct).toFixed(1)}%` : '—' },
    { label: 'Trade count', value: stats ? String(stats.tradeCount) : '—' },
    {
      label: 'Average return',
      value: stats?.avgReturnPct ? `${Number(stats.avgReturnPct).toFixed(2)}%` : '—',
    },
    {
      label: 'Published',
      value: stats?.closedTrades != null ? String(stats.closedTrades) : '—',
    },
    {
      label: 'Largest win',
      value: stats?.bestTradeReturnPct
        ? `${Number(stats.bestTradeReturnPct).toFixed(2)}%`
        : pub?.analytics.bestTrade?.returnPct
          ? `${Number(pub.analytics.bestTrade.returnPct).toFixed(2)}%`
          : '—',
    },
    {
      label: 'Largest loss',
      value: stats?.worstTradeReturnPct
        ? `${Number(stats.worstTradeReturnPct).toFixed(2)}%`
        : pub?.analytics.worstTrade?.returnPct
          ? `${Number(pub.analytics.worstTrade.returnPct).toFixed(2)}%`
          : '—',
    },
    {
      label: 'Best month',
      value: bestMonth != null ? formatPct(bestMonth, 1) : '—',
    },
    {
      label: 'Worst month',
      value: worstMonth != null ? formatPct(worstMonth, 1) : '—',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card-fill flex h-full flex-col p-4">
          <p className="text-caption text-fg-subtle">{c.label}</p>
          <p className="mt-2 text-body-sm font-medium tabular-nums text-fg">{c.value}</p>
        </div>
      ))}
    </div>
  )
}

function TradesInfinite() {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    usePublicTradesInfinite({ limit: 40 })
  const [query, setQuery] = useState('')
  const sentinel = useRef<HTMLDivElement | null>(null)

  const trades = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return trades
    return trades.filter((t) => {
      const row = t as PublicTrade
      return (
        (row.reference ?? '').toLowerCase().includes(q) ||
        row.pair.toLowerCase().includes(q) ||
        String(row.date).includes(q) ||
        String(row.direction).toLowerCase().includes(q)
      )
    })
  }, [trades, query])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '240px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />

  return (
    <div className="space-y-3">
      <TradeStatsStrip />
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pair, date, side, or reference"
          className="pl-9"
          aria-label="Filter trades"
        />
      </div>
      <div className="card-fill overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Exit</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const row = t as PublicTrade
              const pct = Number.parseFloat(String(row.returnPct ?? 0))
              return (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{String(row.date).slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{row.pair}</TableCell>
                  <TableCell>
                    <Badge tone={row.direction === 'BUY' ? 'info' : 'neutral'} size="sm">
                      {row.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-fg-muted">
                    {row.entryPrice ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-fg-muted">
                    {row.exitPrice ?? '—'}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      pct >= 0 ? 'text-profit' : 'text-loss',
                    )}
                  >
                    {formatPct(pct, 3)}
                  </TableCell>
                  <TableCell>
                    <Badge tone={row.status === 'CLOSED' || row.outcome ? 'success' : 'neutral'} size="sm">
                      {row.status ?? row.outcome ?? 'PUBLISHED'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div ref={sentinel} className="flex justify-center py-3">
        {isFetchingNextPage ? (
          <p className="text-caption text-fg-subtle">Loading more trades…</p>
        ) : hasNextPage ? (
          <Button type="button" size="sm" variant="glass" onClick={() => void fetchNextPage()}>
            Load more
          </Button>
        ) : (
          <p className="text-caption text-fg-subtle">
            Showing {filtered.length.toLocaleString()} trades
          </p>
        )}
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
        description="3-Year Verified Demo Backtest — figures from the published programme ledger."
        backdrop="glow"
      >
        <StatTiles />
        <HistoricalNote className="mt-6" />
      </Section>

      <Section
        id="hpc-charts"
        eyebrow="Charts"
        title="Equity, months, and daily settles"
        description="Interactive views of the full multi-year history."
      >
        <HpcCharts />
      </Section>

      <Section
        id="hpc-years"
        eyebrow="Yearly"
        title="Yearly returns"
        description="Every available year with trades, days, and win rate."
      >
        <YearlyCards />
      </Section>

      <Section
        id="hpc-ledger"
        eyebrow="Ledger"
        title="Inspect the book"
        description="Monthly compounds and the full published trade blotter."
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
              description="Newest published tickets first — scroll for more."
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
