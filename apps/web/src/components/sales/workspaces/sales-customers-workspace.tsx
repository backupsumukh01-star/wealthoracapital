'use client'

import { ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesCustomerList } from '@/components/sales/sales-customer-list'
import { SalesEmptyNetwork, SalesQueryError } from '@/components/sales/sales-query-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesNetworkMembers } from '@/features/sales/hooks'

export function SalesCustomersWorkspace() {
  const membersQuery = useSalesNetworkMembers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Read-only list of customers in your sales network."
      />
      {membersQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}
      {membersQuery.isError ? (
        <SalesQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      ) : null}
      {membersQuery.data && membersQuery.data.members.length === 0 ? <SalesEmptyNetwork /> : null}
      {membersQuery.data && membersQuery.data.members.length > 0 ? (
        <SalesCustomerList
          members={membersQuery.data.members}
          hrefFor={(userId) => ROUTES.sales.customer(userId)}
        />
      ) : null}
    </div>
  )
}
