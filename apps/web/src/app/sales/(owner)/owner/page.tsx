import type { Metadata } from 'next'

import { OwnerDashboardWorkspace } from '@/components/sales/workspaces/owner-dashboard-workspace'

export const metadata: Metadata = { title: 'Sales owner', robots: { index: false } }

export default function SalesOwnerPage() {
  return <OwnerDashboardWorkspace />
}
