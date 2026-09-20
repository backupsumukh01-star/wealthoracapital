'use client'

import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { formatMoney, ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { salesQueryKeys, useOwnerSalesmen } from '@/features/sales/hooks'
import { salesOwnerService } from '@/services/sales-owner.service'

export function OwnerReportsWorkspace() {
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
        title="Reports"
        description="Network summary values from owner APIs. This is not a commission report."
      />
      {listQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}
      {listQuery.data && salesmen.length === 0 ? (
        <EmptyState title="No report rows" description="Salesmen will appear here with their network summaries." />
      ) : null}
      {salesmen.length > 0 ? (
        <div className="space-y-3 lg:hidden">
          {salesmen.map((row, index) => {
            const summary = summaries[index]?.data?.summary
            return (
              <Card key={row.id} padded="md" className="space-y-2">
                <Link href={ROUTES.sales.owner.salesman(row.id)} className="font-medium text-fg hover:underline">
                  {row.name}
                </Link>
                <p className="text-caption text-fg-subtle">{row.code}</p>
                {summaries[index]?.isError ? (
                  <p className="text-caption text-danger">Could not load network summary.</p>
                ) : summary ? (
                  <dl className="grid grid-cols-2 gap-2 text-caption">
                    <div>
                      <dt className="text-fg-subtle">Members</dt>
                      <dd className="tabular-nums">{summary.totalMembers.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Direct</dt>
                      <dd className="tabular-nums">{summary.directMembers.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Deposits</dt>
                      <dd className="tabular-nums">{formatMoney(summary.totalApprovedDeposits)}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Net funds</dt>
                      <dd className="tabular-nums">{formatMoney(summary.netFunds)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-caption text-fg-subtle">Loading summary…</p>
                )}
              </Card>
            )
          })}
        </div>
      ) : null}
      {salesmen.length > 0 ? (
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[640px] text-left text-caption">
            <thead>
              <tr className="border-b border-line text-fg-subtle">
                <th className="py-3 pr-4 font-medium">Salesman</th>
                <th className="py-3 pr-4 font-medium">Code</th>
                <th className="py-3 pr-4 font-medium">Members</th>
                <th className="py-3 pr-4 font-medium">Direct</th>
                <th className="py-3 pr-4 font-medium">Deposits</th>
                <th className="py-3 pr-4 font-medium">Withdrawals</th>
                <th className="py-3 font-medium">Net funds</th>
              </tr>
            </thead>
            <tbody>
              {salesmen.map((row, index) => {
                const summary = summaries[index]?.data?.summary
                return (
                  <tr key={row.id} className="border-b border-line/70">
                    <td className="py-3 pr-4">
                      <Link href={ROUTES.sales.owner.salesman(row.id)} className="text-fg hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{row.code}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {summaries[index]?.isError
                        ? 'Error'
                        : summary
                          ? summary.totalMembers.toLocaleString()
                          : '—'}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {summaries[index]?.isError
                        ? 'Error'
                        : summary
                          ? summary.directMembers.toLocaleString()
                          : '—'}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {summaries[index]?.isError
                        ? 'Error'
                        : summary
                          ? formatMoney(summary.totalApprovedDeposits)
                          : '—'}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {summaries[index]?.isError
                        ? 'Error'
                        : summary
                          ? formatMoney(summary.totalPaidWithdrawals)
                          : '—'}
                    </td>
                    <td className="py-3 tabular-nums">
                      {summaries[index]?.isError
                        ? 'Error'
                        : summary
                          ? formatMoney(summary.netFunds)
                          : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
