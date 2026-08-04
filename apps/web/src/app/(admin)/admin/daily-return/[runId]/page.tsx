import type { Metadata } from 'next'

import { AdminReturnRunDetail } from '@/components/admin/admin-return-run-detail'

export const metadata: Metadata = { title: 'Settlement run', robots: { index: false } }

export default function AdminDailyReturnRunPage() {
  return <AdminReturnRunDetail />
}
