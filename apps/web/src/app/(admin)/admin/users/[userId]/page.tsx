import type { Metadata } from 'next'

import { AdminUserDetailWorkspace } from '@/components/admin/admin-user-detail'

export const metadata: Metadata = { title: 'User detail', robots: { index: false } }

export default function AdminUserDetailPage() {
  return <AdminUserDetailWorkspace />
}
