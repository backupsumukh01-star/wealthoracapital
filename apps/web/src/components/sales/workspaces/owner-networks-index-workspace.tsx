'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useOwnerSalesmen } from '@/features/sales/hooks'

export function OwnerNetworksIndexWorkspace() {
  const listQuery = useOwnerSalesmen()
  const salesmen = listQuery.data?.salesmen ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Networks"
        description="Open a salesman network. Salesmen cannot switch between networks."
      />
      {listQuery.isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}
      {listQuery.data && salesmen.length === 0 ? (
        <EmptyState title="No networks" description="Add salesmen before viewing networks." />
      ) : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {salesmen.map((row) => (
          <li key={row.id} className="min-w-0">
            <Link href={ROUTES.sales.owner.salesmanNetwork(row.id)} className="block min-w-0">
              <Card padded="md" interactive>
                <p className="truncate font-medium text-fg">{row.name}</p>
                <p className="text-caption text-fg-subtle">Code {row.code}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
