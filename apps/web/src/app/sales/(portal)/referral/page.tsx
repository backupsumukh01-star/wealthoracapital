import type { Metadata } from 'next'

import { SalesReferralWorkspace } from '@/components/sales/workspaces/sales-referral-workspace'

export const metadata: Metadata = { title: 'Referral link', robots: { index: false } }

export default function SalesReferralPage() {
  return <SalesReferralWorkspace />
}
