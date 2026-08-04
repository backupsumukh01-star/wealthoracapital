'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Percent } from '@/components/common/percent'
import { StatCard } from '@/components/common/stat-card'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import {
  PERFORMANCE_SUMMARY,
  TRADE_HISTORY,
  type TradeLifecycle,
} from '@/lib/dashboard-data'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

type FilterId = 'ALL' | 'PROFIT' | 'LOSS' | 'PENDING' | 'CANCELLED'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PROFIT', label: 'Profit' },
  { id: 'LOSS', label: 'Loss' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

const PAGE_SIZE = 6

const PAIR_TONE: Record<string, string> = {
  'EUR/USD': 'from-blue-400/30 to-blue-600/20 text-blue-200',
  'GBP/USD': 'from-violet-400/30 to-violet-600/20 text-violet-200',
  'USD/JPY': 'from-rose-400/30 to-rose-600/20 text-rose-200',
  'XAU/USD': 'from-amber-400/30 to-amber-600/20 text-amber-200',
  'AUD/USD': 'from-emerald-400/30 to-emerald-600/20 text-emerald-200',
  'BTC/USD': 'from-orange-400/30 to-orange-600/20 text-orange-200',
  'ETH/USD': 'from-indigo-400/30 to-indigo-600/20 text-indigo-200',
}

function pairInitials(pair: string) {
  return pair
    .split('/')
    .map((p) => p.slice(0, 1))
    .join('')
}

function lifecycleTone(lifecycle: TradeLifecycle) {
  if (lifecycle === 'Completed') return 'border-profit/30 bg-profit/10 text-profit'
  if (lifecycle === 'Pending') return 'border-warning/30 bg-warning/10 text-warning'
  return 'border-line bg-hover text-fg-subtle'
}

function TradeHistorySkeleton() {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading trades">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line/70 bg-inset/30 p-4">
          <div className="flex gap-3">
            <Skeleton className="size-11 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TradeHistoryWorkspace() {
  const [filter, setFilter] = useState<FilterId>('ALL')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [booting, setBooting] = useState(true)
  const { ready, state } = useAdminOs()

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), 480)
    return () => window.clearTimeout(id)
  }, [])

  const rows = useMemo(() => {
    const fromCms = ready
      ? state.trades
          .filter((t) => t.status === 'PUBLISHED')
          .map((t) => {
            const pct = Number(String(t.profitPct).replace('%', '').replace('+', ''))
            const win = !Number.isNaN(pct) ? pct >= 0 : !String(t.profitPct).startsWith('-')
            return {
              id: t.id,
              date: t.publishedAt || t.tradingDay || t.createdAt,
              pair: t.pair,
              direction: (String(t.direction).includes('SELL') || String(t.direction).includes('SHORT')
                ? 'SELL'
                : 'BUY') as 'BUY' | 'SELL',
              entry: t.entry,
              exit: t.exit,
              lot: '0.10',
              pips: '—',
              returnPct: String(t.profitPct).replace('%', ''),
              profit: win ? '120.00' : '-80.00',
              result: (win ? 'WIN' : 'LOSS') as 'WIN' | 'LOSS' | 'FLAT',
              lifecycle: 'Completed' as TradeLifecycle,
            }
          })
      : []
    const ids = new Set(fromCms.map((t) => t.id))
    return [...fromCms, ...TRADE_HISTORY.filter((t) => !ids.has(t.id))]
  }, [ready, state.trades])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((t) => {
      if (filter === 'PROFIT' && !(t.lifecycle === 'Completed' && t.result === 'WIN')) return false
      if (filter === 'LOSS' && !(t.lifecycle === 'Completed' && t.result === 'LOSS')) return false
      if (filter === 'PENDING' && t.lifecycle !== 'Pending') return false
      if (filter === 'CANCELLED' && t.lifecycle !== 'Cancelled') return false
      if (!q) return true
      return (
        t.pair.toLowerCase().includes(q) ||
        t.direction.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    })
  }, [filter, query, rows])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const closed = rows.filter((t) => t.lifecycle === 'Completed')
  const wins = closed.filter((t) => t.result === 'WIN').length
  const winRate = closed.length ? ((wins / closed.length) * 100).toFixed(1) : '—'

  function exportCsv() {
    const header = 'id,date,pair,direction,entry,exit,lot,pips,returnPct,profit,result,lifecycle\n'
    const body = filtered
      .map(
        (t) =>
          `${t.id},${t.date},${t.pair},${t.direction},${t.entry},${t.exit},${t.lot},${t.pips},${t.returnPct},${t.profit},${t.result},${t.lifecycle}`,
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'growzy-trades-demo.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Trades exported (demo)')
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6 lg:space-y-8">
      <PageHeader
        className="pb-2 sm:pb-4"
        title={ready ? state.platformCms.trades.title : 'Trade history'}
        description={
          ready
            ? state.platformCms.trades.emptyHint
            : 'Every desk position behind your returns — wins and losses included.'
        }
        actions={
          <Button variant="secondary" className="w-full sm:w-auto" onClick={exportCsv}>
            <Download aria-hidden />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          className="p-4 sm:p-5"
          label="Trades closed"
          value={String(closed.length)}
        />
        <StatCard
          className="p-4 sm:p-5"
          label="Win rate"
          value={`${winRate}%`}
          hint="Winning trades as a share of all closed trades."
        />
        <StatCard
          className="p-4 sm:p-5"
          label="Avg daily"
          value={<Percent value={PERFORMANCE_SUMMARY.avgDailyReturnPct} />}
        />
        <StatCard className="p-4 sm:p-5" label="Best pair" value="EUR/USD" />
      </div>

      <div className="min-w-0 space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search pair, direction, or ID…"
            className="pl-10"
            aria-label="Search trades"
          />
        </div>

        <div
          role="tablist"
          aria-label="Trade filters"
          className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => {
                setFilter(f.id)
                setPage(1)
              }}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-2 text-caption font-medium transition-colors',
                filter === f.id
                  ? 'border-accent-700/40 bg-accent-500/15 text-accent-200'
                  : 'border-line bg-inset/40 text-fg-subtle hover:text-fg',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {booting ? (
        <TradeHistorySkeleton />
      ) : pageRows.length === 0 ? (
        <div className="glass glass-edge rounded-3xl border border-white/8">
          <PremiumEmptyState
            variant="activity"
            title="No trades match"
            description="Try another filter or clear the search to see desk activity."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter('ALL')
                  setQuery('')
                  setPage(1)
                }}
              >
                Reset filters
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="relative space-y-0">
          {pageRows.map((trade, i) => {
            const win = trade.result === 'WIN'
            const loss = trade.result === 'LOSS'
            const pending = trade.lifecycle === 'Pending'
            const tone = PAIR_TONE[trade.pair] ?? 'from-accent-400/25 to-hl-cyan/15 text-accent-200'

            return (
              <li key={trade.id} className="relative flex gap-3 pb-3 last:pb-0 sm:gap-4">
                {i < pageRows.length - 1 ? (
                  <span
                    className="absolute left-[21px] top-12 h-[calc(100%-12px)] w-px bg-line sm:left-[23px]"
                    aria-hidden
                  />
                ) : null}

                <span
                  className={cn(
                    'relative z-10 mt-1 grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-[11px] font-bold tracking-wide sm:size-12',
                    tone,
                  )}
                  aria-hidden
                >
                  {pairInitials(trade.pair)}
                </span>

                <Link
                  href={ROUTES.dashboard.trade(trade.id)}
                  className={cn(
                    'min-w-0 flex-1 rounded-2xl border border-line/80 bg-inset/35 p-3.5',
                    'transition-[border-color,background-color,transform] duration-200',
                    'hover:border-accent-800/40 hover:bg-hover/40 active:scale-[0.995]',
                    'sm:p-4',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-medium text-fg">{trade.pair}</p>
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                            trade.direction === 'BUY'
                              ? 'bg-profit/15 text-profit'
                              : 'bg-loss/15 text-loss',
                          )}
                        >
                          {trade.direction}
                        </span>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            lifecycleTone(trade.lifecycle),
                          )}
                        >
                          {trade.lifecycle}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-fg-subtle">
                        {formatDateTime(trade.date)} · Lot {trade.lot}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                        {trade.entry} → {trade.exit}
                        {trade.pips !== '—' ? ` · ${trade.pips} pips` : null}
                      </p>
                    </div>

                    <div className="text-right">
                      {pending || trade.lifecycle === 'Cancelled' ? (
                        <p className="text-body-sm font-medium text-fg-subtle">—</p>
                      ) : (
                        <>
                          <p
                            className={cn(
                              'inline-flex items-center gap-1 text-body-sm font-semibold tabular-nums',
                              win ? 'text-profit' : loss ? 'text-loss' : 'text-fg',
                            )}
                          >
                            {win ? (
                              <TrendingUp className="size-3.5" aria-hidden />
                            ) : loss ? (
                              <TrendingDown className="size-3.5" aria-hidden />
                            ) : null}
                            <Money value={trade.profit} signed size="sm" />
                          </p>
                          <Percent
                            value={trade.returnPct}
                            className={cn(
                              'mt-0.5 block text-caption',
                              win ? 'text-profit' : loss ? 'text-loss' : 'text-fg-subtle',
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {!booting && filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-caption text-fg-subtle">
            Page {safePage} of {totalPages} · {filtered.length} trades
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-10 min-h-10 px-3"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-10 min-h-10 px-3"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
