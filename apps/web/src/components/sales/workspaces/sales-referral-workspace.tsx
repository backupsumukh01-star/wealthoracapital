'use client'

import { PageHeader } from '@/components/common/page-header'
import { SalesReferralCard } from '@/components/sales/sales-referral-card'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesMe } from '@/features/sales/hooks'

export function SalesReferralWorkspace() {
  const me = useSalesMe()
  const code = me.data?.salesman.code

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Referral Link"
        description="Share your permanent salesman code. New investors who use this code at registration can be attributed to you."
      />
      {me.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {me.isError ? (
        <Alert tone="danger" title="Could not load your sales link">
          Please refresh or sign in again.
        </Alert>
      ) : null}
      {code ? <SalesReferralCard code={code} /> : null}
    </div>
  )
}
