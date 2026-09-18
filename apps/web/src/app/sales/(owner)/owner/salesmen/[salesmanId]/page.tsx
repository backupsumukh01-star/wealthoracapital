import type { Metadata } from 'next'

import { OwnerSalesmanDetailWorkspace } from '@/components/sales/workspaces/owner-salesman-detail-workspace'

export const metadata: Metadata = { title: 'Salesman', robots: { index: false } }

export default function OwnerSalesmanDetailPage() {
  return <OwnerSalesmanDetailWorkspace />
}
