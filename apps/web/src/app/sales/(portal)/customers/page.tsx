import type { Metadata } from 'next'

import { SalesCustomersWorkspace } from '@/components/sales/workspaces/sales-customers-workspace'

export const metadata: Metadata = { title: 'Customers', robots: { index: false } }

export default function SalesCustomersPage() {
  return <SalesCustomersWorkspace />
}
