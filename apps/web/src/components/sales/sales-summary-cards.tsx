'use client'

import type { ReactNode } from 'react'
import { formatMoney } from '@meridian/shared'
import { GitBranch, Landmark, Users, Wallet } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SalesNetworkSummary } from '@/features/sales/types'
import { cn } from '@/lib/cn'

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: typeof Users
}) {
  return (
    <Card padded="md" variant="glass" className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption text-fg-subtle">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 break-words font-medium text-heading-md tabular-nums text-fg">{value}</p>
      {hint ? <p className="mt-1 text-caption text-fg-subtle">{hint}</p> : null}
    </Card>
  )
}

export function SalesSummarySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading network summary"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} padded="md" variant="glass">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-8 w-36" />
        </Card>
      ))}
    </div>
  )
}

/**
 * Renders API summary fields only. No deposit/withdrawal arithmetic.
 */
export function SalesSummaryCards({
  summary,
  className,
}: {
  summary: SalesNetworkSummary
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      <StatCard
        label="Total Network Members"
        value={summary.totalMembers.toLocaleString()}
        icon={Users}
      />
      <StatCard
        label="Direct Customers"
        value={summary.directMembers.toLocaleString()}
        icon={GitBranch}
      />
      <StatCard
        label="Network Depth"
        value={summary.maxDepth.toLocaleString()}
        hint="Levels reported by the server"
        icon={GitBranch}
      />
      <StatCard
        label="Total Approved Deposits"
        value={formatMoney(summary.totalApprovedDeposits)}
        icon={Landmark}
      />
      <StatCard
        label="Paid / Completed Withdrawals"
        value={formatMoney(summary.totalPaidWithdrawals)}
        icon={Wallet}
      />
      <StatCard label="Net Network Funds" value={formatMoney(summary.netFunds)} icon={Wallet} />
    </div>
  )
}
