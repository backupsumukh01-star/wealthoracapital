'use client'

import Link from 'next/link'
import { formatDate, formatMoney, ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesEmptyNetwork, SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesReferralCard } from '@/components/sales/sales-referral-card'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useSalesMe, useSalesNetworkMembers, useSalesNetworkSummary } from '@/features/sales/hooks'

export function SalesDashboardWorkspace() {
  const me = useSalesMe()
  const summaryQuery = useSalesNetworkSummary()
  const membersQuery = useSalesNetworkMembers()
  const salesman = me.data?.salesman
  const recent = [...(membersQuery.data?.members ?? [])]
    .sort((a, b) => b.registrationDate.localeCompare(a.registrationDate))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Network reporting for your attributed customers. Totals come from the Sales Network API."
      />
      {salesman ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-body-sm text-fg">{salesman.name}</p>
          <Badge tone="outline" size="sm">
            {salesman.code}
          </Badge>
          <Badge tone={salesman.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
            {salesman.status === 'ACTIVE' ? 'Active' : 'Disabled'}
          </Badge>
        </div>
      ) : null}
      {summaryQuery.isPending ? <SalesSummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summaryQuery.data ? <SalesSummaryCards summary={summaryQuery.data.summary} /> : null}

      {salesman ? (
        <section className="space-y-3">
          <h2 className="text-heading-sm text-fg">My Referral Link</h2>
          <SalesReferralCard code={salesman.code} link={salesman.referralLink} />
        </section>
      ) : null}

      {membersQuery.isError ? (
        <SalesQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      ) : null}
      {membersQuery.data && membersQuery.data.members.length === 0 ? (
        <SalesEmptyNetwork title="No customers in your network yet" />
      ) : null}

      {recent.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-heading-sm text-fg">Recent customer activity</h2>
          <ul className="space-y-2">
            {recent.map((member) => (
              <li key={member.userId} className="min-w-0">
                <Link href={ROUTES.sales.customer(member.userId)} className="block min-w-0">
                  <Card padded="md" interactive className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{member.name}</p>
                      <p className="text-caption text-fg-subtle">
                        {member.isDirect ? 'Direct' : 'Indirect'} · Level {member.level} ·{' '}
                        {formatDate(member.registrationDate)}
                      </p>
                    </div>
                    <p className="tabular-nums text-caption text-fg-muted">
                      {formatMoney(member.netFunds)}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
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
