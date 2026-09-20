'use client'

import { PageHeader } from '@/components/common/page-header'
import { SalesReferralCard } from '@/components/sales/sales-referral-card'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesMe } from '@/features/sales/hooks'

export function SalesReferralWorkspace() {
  const me = useSalesMe()
  const salesman = me.data?.salesman
  const code = salesman?.code

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Referral Link"
        description="Share your salesman promo code. New investors who use this code at registration can be attributed to you."
      />
      {me.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {me.isError ? (
        <Alert tone="danger" title="Could not load your sales link">
          Please refresh or sign in again.
        </Alert>
      ) : null}
      {code ? <SalesReferralCard code={code} link={salesman?.referralLink} /> : null}
    </div>
  )
}
