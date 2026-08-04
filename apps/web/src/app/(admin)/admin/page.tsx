import type { Metadata } from 'next'

import { AdminOverviewWorkspace } from '@/components/admin/admin-overview-workspace'

export const metadata: Metadata = { title: 'Operator overview', robots: { index: false } }

export default function AdminOverviewPage() {
  return <AdminOverviewWorkspace />
}
