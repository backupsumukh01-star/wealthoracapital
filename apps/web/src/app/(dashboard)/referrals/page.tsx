import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'

import { PageHeader } from '@/components/common/page-header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Referrals', robots: { index: false } }

/**
 * A v1.1 feature. The route exists so the eventual link is not a 404 for anyone who has the URL,
 * but it is hidden from the sidebar behind `NEXT_PUBLIC_ENABLE_REFERRALS` (docs/03 §Roadmap).
 */
export default function ReferralsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Referrals" description="Not available yet." />

      <Card className="p-6">
        <EmptyState
          icon={Sparkles}
          title="The referral programme is not live"
          description="It is scheduled for a later release. Nothing is required from you now, and no referral has been missed."
        />
      </Card>
    </div>
  )
}
