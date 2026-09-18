import type { Metadata } from 'next'

import { SalesCustomerDetailWorkspace } from '@/components/sales/workspaces/sales-customer-detail-workspace'

export const metadata: Metadata = { title: 'Customer', robots: { index: false } }

export default function SalesCustomerDetailPage() {
  return <SalesCustomerDetailWorkspace />
}
