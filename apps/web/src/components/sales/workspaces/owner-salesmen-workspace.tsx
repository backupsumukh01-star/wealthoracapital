'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useOwnerSalesmen } from '@/features/sales/hooks'

export function OwnerSalesmenWorkspace() {
  const listQuery = useOwnerSalesmen()
  const salesmen = listQuery.data?.salesmen ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Salesmen" description="Directory of Sales Portal salesmen." />
      {listQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}
      {listQuery.data && salesmen.length === 0 ? (
        <EmptyState title="No salesmen" description="There are no salesman records to display." />
      ) : null}
      {salesmen.length > 0 ? (
        <ul className="space-y-3">
          {salesmen.map((row) => (
            <li key={row.id} className="min-w-0">
              <Card padded="md" className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-fg">{row.name}</p>
                    <Badge tone={row.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                      {row.status}
                    </Badge>
                  </div>
                  <p className="truncate text-caption text-fg-subtle">{row.email}</p>
                  <p className="text-caption text-fg-muted">Code {row.code}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-caption">
                  <Link className="text-accent hover:underline" href={ROUTES.sales.owner.salesman(row.id)}>
                    Details
                  </Link>
                  <Link
                    className="text-accent hover:underline"
                    href={ROUTES.sales.owner.salesmanNetwork(row.id)}
                  >
                    Network
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
