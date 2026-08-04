import type { Metadata } from 'next'

import { AdminReportsWorkspace } from '@/components/admin/admin-reports-workspace'

export const metadata: Metadata = { title: 'Reports', robots: { index: false } }

export default function AdminReportsPage() {
  return <AdminReportsWorkspace />
}
