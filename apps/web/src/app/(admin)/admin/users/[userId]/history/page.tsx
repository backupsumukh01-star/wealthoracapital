import type { Metadata } from 'next'

import { AdminUserHistoryWorkspace } from '@/components/admin/admin-user-history-workspace'

export const metadata: Metadata = { title: 'Historical data', robots: { index: false } }

export default function AdminUserHistoryPage() {
  return <AdminUserHistoryWorkspace />
}
