import type { Metadata } from 'next'

import { AdminReferralsWorkspace } from '@/components/admin/admin-referrals-workspace'

export const metadata: Metadata = { title: 'Referrals', robots: { index: false } }

export default function AdminReferralsPage() {
  return <AdminReferralsWorkspace />
}
