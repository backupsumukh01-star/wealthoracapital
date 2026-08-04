'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { Money } from '@/components/common/money'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { DEMO_LEDGER, type LedgerFilter } from '@/lib/investor-demo-data'
import { formatDateTime } from '@/lib/format'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'DEPOSIT', label: 'Deposit' },
  { id: 'WITHDRAWAL', label: 'Withdrawal' },
  { id: 'RETURN', label: 'Profit' },
  { id: 'BONUS', label: 'Bonus' },
  { id: 'REFERRAL', label: 'Referral' },
]

const DOT: Record<string, string> = {
  DEPOSIT: 'bg-info',
  WITHDRAWAL: 'bg-warning',
  RETURN: 'bg-profit',
  BONUS: 'bg-accent-300',
  REFERRAL: 'bg-hl-cyan',
  ALL: 'bg-fg-subtle',
}

/** Premium activity timeline — not a spreadsheet. */
export function ActivityTimeline({
  limit,
  showFilters = true,
  searchable,
}: {
  limit?: number
  showFilters?: boolean
  searchable?: boolean
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [filter, setFilter] = useState<LedgerFilter>('ALL')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = DEMO_LEDGER.filter((r) => (filter === 'ALL' ? true : r.filter === filter))
    if (q) {
      list = list.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q),
      )
    }
    return typeof limit === 'number' ? list.slice(0, limit) : list
  }, [filter, query, limit])

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Activity</p>
          <p className="mt-1 text-body-sm text-fg-muted">Money moves on a living timeline</p>
        </div>
      </div>

      {showFilters ? (
        <div
          role="tablist"
          className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-inset/50 p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-caption font-medium transition-colors',
                filter === f.id ? 'bg-raised text-fg shadow-e1' : 'text-fg-subtle hover:text-fg',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {searchable ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reference or label…"
          className="mt-3 h-11 w-full rounded-xl border border-line bg-inset px-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Search activity"
        />
      ) : null}

      <ol className="relative mt-5 space-y-0">
        {rows.map((row, i) => {
          const negative = Number(row.amount) < 0
          const tone = DOT[row.filter] ?? DOT.ALL
          return (
            <motion.li
              key={row.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {i < rows.length - 1 ? (
                <motion.span
                  className="absolute left-[9px] top-5 origin-top w-px bg-line"
                  aria-hidden
                  initial={prefersReducedMotion ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: Math.min(i, 8) * 0.05 + 0.12, duration: 0.5 }}
                  style={{ height: 'calc(100% - 8px)' }}
                />
              ) : null}
              <motion.span
                className={cn(
                  'relative z-10 mt-1.5 size-[18px] shrink-0 rounded-full ring-4 ring-base',
                  tone,
                )}
                aria-hidden
                initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22, delay: Math.min(i, 8) * 0.05 }}
              />
              <div className="min-w-0 flex-1 rounded-2xl border border-line/70 bg-inset/30 px-3.5 py-3 transition-colors hover:bg-hover/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-fg">{row.label}</p>
                    <p className="mt-0.5 font-mono text-caption text-fg-subtle">{row.reference}</p>
                    <p className="mt-1 text-caption text-fg-subtle">{formatDateTime(row.date)}</p>
                  </div>
                  <p
                    className={cn(
                      'text-body-sm font-semibold tabular-nums',
                      negative ? 'text-loss' : 'text-profit',
                    )}
                  >
                    <Money value={row.amount} signed />
                  </p>
                </div>
              </div>
            </motion.li>
          )
        })}
        {rows.length === 0 ? (
          <li>
            <PremiumEmptyState
              title="No activity yet"
              description="Deposits, returns, and withdrawals will land on this timeline."
            />
          </li>
        ) : null}
      </ol>
    </div>
  )
}
