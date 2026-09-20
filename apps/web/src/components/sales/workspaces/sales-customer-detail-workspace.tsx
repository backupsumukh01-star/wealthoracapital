'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatDate, formatMoney, ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { isSalesNotFound } from '@/features/sales/auth-errors'
import { useSalesNetworkMember } from '@/features/sales/hooks'

export function SalesCustomerDetailWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = typeof params.userId === 'string' ? params.userId : ''
  const detailQuery = useSalesNetworkMember(userId || undefined)
  const member = detailQuery.data?.member
  const notInNetwork = isSalesNotFound(detailQuery.error)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={ROUTES.sales.customers} className="text-accent hover:underline">
            Back to customers
          </Link>
        }
        title={member?.name ?? 'Customer'}
        description="Read-only customer reporting. Personal contact details are not available in Sales."
      />

      {detailQuery.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {detailQuery.isError && !notInNetwork ? (
        <SalesQueryError error={detailQuery.error} onRetry={() => void detailQuery.refetch()} />
      ) : null}

      {notInNetwork || (detailQuery.data && !member) ? (
        <EmptyState
          title="Customer not in your network"
          description="This person is not part of the authenticated salesman’s attributed network."
          action={
            <Button asChild variant="secondary">
              <Link href={ROUTES.sales.customers}>View customers</Link>
            </Button>
          }
        />
      ) : null}

      {member ? (
        <>
          <Card padded="lg" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={member.isDirect ? 'accent' : 'neutral'}>
                {member.isDirect ? 'Direct' : 'Indirect'}
              </Badge>
              <Badge tone="outline">Level {member.level}</Badge>
            </div>
            <p className="text-body-sm text-fg-muted">@{member.username}</p>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-fg-subtle">Tree parent</dt>
                <dd className="text-body-sm">{member.parentName ?? 'Attributed root'}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">Registered</dt>
                <dd className="text-body-sm">{formatDate(member.registrationDate)}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">Current balance</dt>
                <dd className="tabular-nums text-body-sm">{formatMoney(member.currentBalance)}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">Total approved deposits</dt>
                <dd className="tabular-nums text-body-sm">{formatMoney(member.approvedDeposits)}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">Total completed withdrawals</dt>
                <dd className="tabular-nums text-body-sm">{formatMoney(member.paidWithdrawals)}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">Direct referrals</dt>
                <dd className="tabular-nums text-body-sm">{member.directReferralCount}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">Network members</dt>
                <dd className="tabular-nums text-body-sm">{member.networkMemberCount}</dd>
              </div>
            </dl>
          </Card>

          <HistoryTable title="Deposit history" rows={detailQuery.data?.depositHistory ?? []} empty="No deposits yet." />
          <HistoryTable
            title="Withdrawal history"
            rows={detailQuery.data?.withdrawalHistory ?? []}
            empty="No withdrawals yet."
          />
        </>
      ) : null}
    </div>
  )
}

function HistoryTable({
  title,
  rows,
  empty,
}: {
  title: string
  rows: Array<{ date: string; amount: string; currency?: string; status: string; reference: string }>
  empty: string
}) {
  return (
    <Card padded="lg" className="space-y-3">
      <h2 className="text-heading-sm text-fg">{title}</h2>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-caption">
            <thead>
              <tr className="text-fg-subtle">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Currency</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.reference}-${row.date}-${row.status}`} className="border-t border-line">
                  <td className="py-2 pr-4">{formatDate(row.date)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatMoney(row.amount)}</td>
                  <td className="py-2 pr-4">{row.currency ?? 'USD'}</td>
                  <td className="py-2 pr-4">{row.status}</td>
                  <td className="py-2 font-mono text-fg-muted">{row.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-caption text-fg-muted">{empty}</p>
      )}
    </Card>
  )
}
