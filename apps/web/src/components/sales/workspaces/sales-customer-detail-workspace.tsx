'use client'

import { useParams } from 'next/navigation'
import { formatDate, formatMoney, ROUTES } from '@meridian/shared'
import Link from 'next/link'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesNetworkMembers } from '@/features/sales/hooks'

export function SalesCustomerDetailWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = typeof params.userId === 'string' ? params.userId : ''
  const membersQuery = useSalesNetworkMembers()
  const member = membersQuery.data?.members.find((row) => row.userId === userId)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={ROUTES.sales.customers} className="text-accent hover:underline">
            Back to customers
          </Link>
        }
        title={member?.name ?? 'Customer'}
        description="Read-only network member details from the Sales Network API."
      />
      {membersQuery.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {membersQuery.isError ? (
        <SalesQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      ) : null}
      {membersQuery.data && !member ? (
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
        <Card padded="lg" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone={member.isDirect ? 'accent' : 'neutral'}>
              {member.isDirect ? 'Direct' : 'Indirect'}
            </Badge>
            <Badge tone="outline">Level {member.level}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-fg-subtle">Email</dt>
              <dd className="break-all text-body-sm">{member.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Registered</dt>
              <dd className="text-body-sm">{formatDate(member.registrationDate)}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Approved deposits</dt>
              <dd className="tabular-nums text-body-sm">{formatMoney(member.approvedDeposits)}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Paid withdrawals</dt>
              <dd className="tabular-nums text-body-sm">{formatMoney(member.paidWithdrawals)}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Net funds</dt>
              <dd className="tabular-nums text-body-sm">{formatMoney(member.netFunds)}</dd>
            </div>
          </dl>
        </Card>
      ) : null}
    </div>
  )
}
