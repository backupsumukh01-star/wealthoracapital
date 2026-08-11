import type { Metadata } from 'next'

import { ReferralsWorkspace } from '@/components/dashboard/referrals-workspace'

export const metadata: Metadata = { title: 'Referrals', robots: { index: false } }

/**
 * Investor referral dashboard.
 * Reward creation stays behind API `referralEnabled`.
 */
export default function ReferralsPage() {
  return <ReferralsWorkspace />
}
