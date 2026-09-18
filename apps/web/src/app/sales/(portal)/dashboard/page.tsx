import type { Metadata } from 'next'

import { SalesDashboardWorkspace } from '@/components/sales/workspaces/sales-dashboard-workspace'

export const metadata: Metadata = { title: 'Sales dashboard', robots: { index: false } }

export default function SalesDashboardPage() {
  return <SalesDashboardWorkspace />
}
