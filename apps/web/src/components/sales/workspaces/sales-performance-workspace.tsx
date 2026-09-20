'use client'

import { formatMoney, indirectMemberCount } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesNetworkSummary } from '@/features/sales/hooks'

export function SalesPerformanceWorkspace() {
  const summaryQuery = useSalesNetworkSummary()
  const summary = summaryQuery.data?.summary

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Reporting metrics from the Sales Network summary API. This page does not rank salesmen or calculate commissions."
      />
      {summaryQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summary ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Total customers" value={summary.totalMembers.toLocaleString()} />
          <Metric label="Direct customers" value={summary.directMembers.toLocaleString()} />
          <Metric
            label="Indirect customers"
            value={indirectMemberCount(summary).toLocaleString()}
          />
          <Metric label="Network depth" value={summary.maxDepth.toLocaleString()} />
          <Metric label="Approved deposits" value={formatMoney(summary.totalApprovedDeposits)} />
          <Metric
            label="Paid / Completed Withdrawals"
            value={formatMoney(summary.totalPaidWithdrawals)}
          />
          <Metric label="Net funds" value={formatMoney(summary.netFunds)} />
        </div>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card padded="md">
      <p className="text-caption text-fg-subtle">{label}</p>
      <p className="mt-2 break-words text-heading-sm tabular-nums text-fg">{value}</p>
    </Card>
  )
}
