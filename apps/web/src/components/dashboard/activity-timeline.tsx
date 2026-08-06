'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { useActivity, type ActivityCategory } from '@/features/activity/hooks'
import { formatDateTime } from '@/lib/format'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

type ActivityFilter = 'all' | ActivityCategory

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'kyc', label: 'KYC' },
  { id: 'profit', label: 'Profit' },
  { id: 'security', label: 'Security' },
]

const DOT: Record<string, string> = {
  deposits: 'bg-info',
  withdrawals: 'bg-warning',
  kyc: 'bg-accent',
  profit: 'bg-success',
  security: 'bg-danger',
  all: 'bg-fg-subtle',
}

function categoryForKind(kind: string): ActivityFilter {
  if (kind.startsWith('DEPOSIT_')) return 'deposits'
  if (kind.startsWith('WITHDRAWAL_')) return 'withdrawals'
  if (kind.startsWith('KYC_')) return 'kyc'
  if (
    kind === 'DAILY_RETURN_APPLIED' ||
    kind === 'DISTRIBUTION_COMPLETE' ||
    kind.startsWith('TRADE_')
  ) {
    return 'profit'
  }
  if (
    [
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'EMAIL_CHANGE',
      'SESSION_TERMINATED',
      'REGISTRATION',
    ].includes(kind)
  ) {
    return 'security'
  }
  return 'all'
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
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [query, setQuery] = useState('')
  const { data, isLoading } = useActivity(
    {
      category: filter === 'all' ? undefined : filter,
      limit,
    },
    { enabled: Boolean(session) },
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = data?.items ?? []
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.kind.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [query, data?.items])

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
          placeholder="Search activity..."
          className="mt-4 h-10 w-full rounded-xl border border-line bg-inset/60 px-3 text-body-sm text-fg"
        />
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-body-sm text-fg-subtle">Loading activity...</p>
      ) : rows.length === 0 ? (
        <PremiumEmptyState
          className="mt-6 py-8"
          title="No activity yet"
          description="Deposits, withdrawals, KYC, profit and security events will appear here."
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
              <span
                className={cn(
                  'mt-1.5 size-2 shrink-0 rounded-full',
                  DOT[categoryForKind(row.kind)],
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-fg">{row.title}</p>
                {row.description ? (
                  <p className="mt-1 text-caption text-fg-muted">{row.description}</p>
                ) : null}
                <p className="mt-1 text-caption text-fg-subtle">
                  {formatDateTime(row.at)} - {row.kind}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
