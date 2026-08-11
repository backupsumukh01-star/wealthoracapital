import type { Metadata } from 'next'

import { ReferralsWorkspace } from '@/components/dashboard/referrals-workspace'

export const metadata: Metadata = { title: 'Referrals', robots: { index: false } }

/**
 * Investor referral dashboard. Sidebar remains gated by `NEXT_PUBLIC_ENABLE_REFERRALS`.
 * Reward creation stays behind API `referralEnabled` (kept false until a later phase).
 */
export default function ReferralsPage() {
  return <ReferralsWorkspace />
}
