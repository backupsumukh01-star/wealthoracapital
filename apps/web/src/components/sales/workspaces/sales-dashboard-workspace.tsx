'use client'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesReferralCard } from '@/components/sales/sales-referral-card'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { Card } from '@/components/ui/card'
import { useSalesMe, useSalesNetworkSummary } from '@/features/sales/hooks'

export function SalesDashboardWorkspace() {
  const me = useSalesMe()
  const summaryQuery = useSalesNetworkSummary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Network reporting for your attributed customers. Totals come from the Sales Network API."
      />
      {summaryQuery.isPending ? <SalesSummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summaryQuery.data ? <SalesSummaryCards summary={summaryQuery.data.summary} /> : null}

      {me.data?.salesman ? (
        <section className="space-y-3">
          <h2 className="text-heading-sm text-fg">My Referral Link</h2>
          <SalesReferralCard code={me.data.salesman.code} />
        </section>
      ) : null}

      <Card padded="md" variant="ghost">
        <p className="text-caption text-fg-muted">
          This portal is a read-only view of existing Wealthora data. Deposits, withdrawals, and
          ledgers are not managed here.
        </p>
      </Card>
    </div>
  )
}
