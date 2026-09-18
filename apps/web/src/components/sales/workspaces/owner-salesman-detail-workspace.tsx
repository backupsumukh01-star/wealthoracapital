'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatMoney, ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesOwnerSwitcher } from '@/components/sales/sales-owner-shell'
import { SalesCustomerList } from '@/components/sales/sales-customer-list'
import { SalesEmptyNetwork, SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useOwnerNetworkMembers,
  useOwnerNetworkSummary,
  useOwnerSalesmen,
} from '@/features/sales/hooks'

export function OwnerSalesmanDetailWorkspace() {
  const params = useParams<{ salesmanId: string }>()
  const salesmanId = typeof params.salesmanId === 'string' ? params.salesmanId : ''
  const listQuery = useOwnerSalesmen()
  const summaryQuery = useOwnerNetworkSummary(salesmanId || undefined)
  const membersQuery = useOwnerNetworkMembers(salesmanId || undefined)
  const salesman = listQuery.data?.salesmen.find((row) => row.id === salesmanId)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={ROUTES.sales.owner.salesmen} className="text-accent hover:underline">
            Back to salesmen
          </Link>
        }
        title={salesman?.name ?? summaryQuery.data?.salesman.name ?? 'Salesman'}
        description="Read-only salesman profile and network reporting."
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
            <SalesOwnerSwitcher salesmen={listQuery.data?.salesmen ?? []} currentId={salesmanId} />
            {salesmanId ? (
              <Button asChild variant="secondary">
                <Link href={ROUTES.sales.owner.salesmanNetwork(salesmanId)}>View network tree</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {salesman ? (
        <Card padded="md" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg">{salesman.name}</p>
            <Badge tone={salesman.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
              {salesman.status}
            </Badge>
          </div>
          <p className="break-all text-caption text-fg-subtle">{salesman.email}</p>
          <p className="text-caption text-fg-muted">Code {salesman.code}</p>
        </Card>
      ) : listQuery.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : null}

      {summaryQuery.isLoading ? <SalesSummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summaryQuery.data ? (
        <>
          <SalesSummaryCards summary={summaryQuery.data.summary} />
          <Card padded="md">
            <p className="text-caption text-fg-subtle">Total network funds</p>
            <p className="mt-1 text-heading-sm tabular-nums">
              {formatMoney(summaryQuery.data.summary.netFunds)}
            </p>
          </Card>
        </>
      ) : null}

      {membersQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {membersQuery.isError ? (
        <SalesQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      ) : null}
      {membersQuery.data && membersQuery.data.members.length === 0 ? <SalesEmptyNetwork /> : null}
      {membersQuery.data && membersQuery.data.members.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-heading-sm">Network members</h2>
          <SalesCustomerList members={membersQuery.data.members} />
        </section>
      ) : null}
    </div>
  )
}
