'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { Money } from '@/components/common/money'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { useDeposits } from '@/features/deposits/hooks'
import { useWithdrawals } from '@/features/withdrawals/hooks'
import { formatDateTime } from '@/lib/format'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

type LedgerFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAWAL'

const FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'DEPOSIT', label: 'Deposit' },
  { id: 'WITHDRAWAL', label: 'Withdrawal' },
]

const DOT: Record<string, string> = {
  DEPOSIT: 'bg-info',
  WITHDRAWAL: 'bg-warning',
  ALL: 'bg-fg-subtle',
}

/** Premium activity timeline — not a spreadsheet. */
export function ActivityTimeline({
  limit,
  showFilters = true,
}: {
  limit?: number
  showFilters?: boolean
  searchable?: boolean
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { session } = useSession()
  const { data: depositsData } = useDeposits(undefined, { enabled: Boolean(session) })
  const { data: withdrawalsData } = useWithdrawals(undefined, { enabled: Boolean(session) })
  const [filter, setFilter] = useState<LedgerFilter>('ALL')
  const [query, setQuery] = useState('')

  const ledger = useMemo(() => {
    const deposits = (depositsData?.items ?? []).map((d) => ({
      id: d.id,
      filter: 'DEPOSIT' as LedgerFilter,
      label: `Deposit ${d.status.toLowerCase()}`,
      reference: d.reference,
      amount: d.amount,
      date: d.createdAt,
    }))
    const withdrawals = (withdrawalsData?.items ?? []).map((w) => ({
      id: w.id,
      filter: 'WITHDRAWAL' as LedgerFilter,
      label: `Withdrawal ${w.status.toLowerCase()}`,
      reference: w.reference,
      amount: `-${w.amount}`,
      date: w.createdAt,
    }))
    return [...deposits, ...withdrawals].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [depositsData?.items, withdrawalsData?.items])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = ledger.filter((r) => (filter === 'ALL' ? true : r.filter === filter))
    if (q) {
      list = list.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q),
      )
    }
    return typeof limit === 'number' ? list.slice(0, limit) : list
  }, [filter, query, limit, ledger])

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Activity</p>
          <p className="mt-1 text-body-sm text-fg-muted">Money moves on a living timeline</p>
        </div>
        {showFilters ? (
          <div className="flex gap-1 rounded-xl border border-line bg-inset/50 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-caption font-medium',
                  filter === f.id ? 'bg-accent-500/20 text-accent-200' : 'text-fg-subtle',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {showFilters ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reference…"
          className="mt-4 h-10 w-full rounded-xl border border-line bg-inset/60 px-3 text-body-sm text-fg"
        />
      ) : null}

      {rows.length === 0 ? (
        <PremiumEmptyState
          className="mt-6 py-8"
          title="No activity yet"
          description="Deposits and withdrawals will appear here."
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row, i) => (
            <motion.li
              key={row.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 rounded-2xl border border-line/70 bg-inset/30 px-3.5 py-3"
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[row.filter])} />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-fg">{row.label}</p>
                <p className="text-caption text-fg-subtle">
                  {formatDateTime(row.date)} · {row.reference}
                </p>
              </div>
              <Money value={row.amount} signed className="text-body-sm font-medium" />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
