'use client'

import { PageHeader } from '@/components/common/page-header'
import { SalesNetworkTree } from '@/components/sales/sales-network-tree'
import { SalesEmptyNetwork, SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesNetworkMembers, useSalesNetworkSummary } from '@/features/sales/hooks'

export function SalesNetworkWorkspace() {
  const summaryQuery = useSalesNetworkSummary()
  const membersQuery = useSalesNetworkMembers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Network"
        description="Your attributed root customers and their investor referral descendants."
      />
      {summaryQuery.isLoading ? <SalesSummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summaryQuery.data ? <SalesSummaryCards summary={summaryQuery.data.summary} /> : null}

      {membersQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}
      {membersQuery.isError ? (
        <SalesQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      ) : null}
      {membersQuery.data && membersQuery.data.members.length === 0 ? <SalesEmptyNetwork /> : null}
      {membersQuery.data && membersQuery.data.members.length > 0 ? (
        <SalesNetworkTree salesman={membersQuery.data.salesman} members={membersQuery.data.members} />
      ) : null}
    </div>
  )
}
