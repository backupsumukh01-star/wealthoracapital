'use client'

import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { formatMoney, ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { salesQueryKeys, useOwnerSalesmen } from '@/features/sales/hooks'
import { salesOwnerService } from '@/services/sales-owner.service'

export function OwnerDashboardWorkspace() {
  const listQuery = useOwnerSalesmen()
  const salesmen = listQuery.data?.salesmen ?? []
  const summaries = useQueries({
    queries: salesmen.map((row) => ({
      queryKey: salesQueryKeys.owner.summary(row.id),
      queryFn: () => salesOwnerService.networkSummary(row.id),
      enabled: salesmen.length > 0,
      staleTime: 30_000,
    })),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Dashboard"
        description="All salesmen. Network totals are loaded from owner summary APIs when available."
      />
      {listQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : null}
      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}
      {listQuery.data && salesmen.length === 0 ? (
        <EmptyState title="No salesmen yet" description="Salesmen will appear here when they exist in the Sales Portal." />
      ) : null}
      {salesmen.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {salesmen.map((row, index) => {
            const summary = summaries[index]?.data?.summary
            return (
              <li key={row.id} className="min-w-0">
                <Link href={ROUTES.sales.owner.salesman(row.id)} className="block min-w-0">
                  <Card padded="md" interactive className="h-full space-y-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-body-sm font-medium text-fg">{row.name}</p>
                      <Badge tone={row.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {row.status}
                      </Badge>
                    </div>
                    <p className="truncate text-caption text-fg-subtle">{row.email}</p>
                    <p className="text-caption text-fg-muted">Code {row.code}</p>
                    {summary ? (
                      <dl className="grid grid-cols-2 gap-2 text-caption">
                        <div>
                          <dt className="text-fg-subtle">Members</dt>
                          <dd className="tabular-nums">{summary.totalMembers.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-fg-subtle">Net funds</dt>
                          <dd className="tabular-nums">{formatMoney(summary.netFunds)}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
