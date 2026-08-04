import type { Metadata } from 'next'

import { WealthHome } from '@/components/dashboard/wealth-home'

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } }

/**
 * Investor home — premium wealth experience. Dummy data only.
 */
export default function DashboardPage() {
  return <WealthHome />
}
