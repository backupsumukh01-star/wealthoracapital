'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesNetworkTree } from '@/components/sales/sales-network-tree'
import { SalesEmptyNetwork, SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useOwnerNetworkMembers,
  useOwnerNetworkSummary,
  useOwnerSalesmen,
} from '@/features/sales/hooks'

export function OwnerNetworkWorkspace() {
  const params = useParams<{ salesmanId: string }>()
  const router = useRouter()
  const salesmanId = typeof params.salesmanId === 'string' ? params.salesmanId : ''
  const listQuery = useOwnerSalesmen()
  const summaryQuery = useOwnerNetworkSummary(salesmanId || undefined)
  const membersQuery = useOwnerNetworkMembers(salesmanId || undefined)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={ROUTES.sales.owner.salesman(salesmanId)} className="text-accent hover:underline">
            Back to salesman
          </Link>
        }
        title="Network"
        description="Owner view of one salesman’s attributed network."
        actions={
          <label className="flex min-w-0 flex-col gap-1.5 sm:max-w-xs">
            <span className="text-caption text-fg-subtle">Salesman</span>
            <select
              className="h-12 w-full rounded-xl border border-line-default bg-inset/80 px-3.5 text-base text-fg"
              value={salesmanId}
              onChange={(event) => {
                router.push(ROUTES.sales.owner.salesmanNetwork(event.target.value))
              }}
            >
              {(listQuery.data?.salesmen ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.code}
                </option>
              ))}
            </select>
          </label>
        }
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
