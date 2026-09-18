'use client'

import { PageHeader } from '@/components/common/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesMe } from '@/features/sales/hooks'

export function SalesProfileWorkspace() {
  const me = useSalesMe()
  const salesman = me.data?.salesman

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Safe account details from your sales session." />
      {me.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {me.isError ? (
        <Alert tone="danger" title="Could not load profile">
          Please refresh or sign in again.
        </Alert>
      ) : null}
      {salesman ? (
        <Card padded="lg" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-heading-sm text-fg">{salesman.name}</h2>
            <Badge tone={salesman.status === 'ACTIVE' ? 'success' : 'danger'}>
              {salesman.status === 'ACTIVE' ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-fg-subtle">Email</dt>
              <dd className="break-all text-body-sm">{salesman.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Sales code</dt>
              <dd className="text-body-sm">{salesman.code}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-subtle">Referral link</dt>
              <dd className="break-all text-body-sm">{salesman.referralLink}</dd>
            </div>
          </dl>
          <p className="text-caption text-fg-muted">
            This profile is view-only. Password changes and account deletion are not available in
            this portal.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
