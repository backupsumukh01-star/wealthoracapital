import type { Metadata } from 'next'

import { AdminReturnsWorkspace } from '@/components/admin/admin-returns-workspace'

export const metadata: Metadata = { title: 'Daily return', robots: { index: false } }

export default function AdminDailyReturnPage() {
  return <AdminReturnsWorkspace />
}
