'use client'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { Card } from '@/components/ui/card'
import { useSalesNetworkSummary } from '@/features/sales/hooks'

export function SalesInvestmentsWorkspace() {
  const summaryQuery = useSalesNetworkSummary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        description="Read-only network funding totals. Transaction-level investment history is not available in this portal."
      />
      {summaryQuery.isLoading ? <SalesSummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summaryQuery.data ? <SalesSummaryCards summary={summaryQuery.data.summary} /> : null}
      <Card padded="md">
        <p className="text-body-sm text-fg-muted">
          Approve, reject, refund, credit, and debit actions are not part of the Sales Portal.
          Funding totals above are provided by the network summary API.
        </p>
      </Card>
    </div>
  )
}
