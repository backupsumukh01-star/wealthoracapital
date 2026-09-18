import type { Metadata } from 'next'

import { OwnerSalesmenWorkspace } from '@/components/sales/workspaces/owner-salesmen-workspace'

export const metadata: Metadata = { title: 'Salesmen', robots: { index: false } }

export default function OwnerSalesmenPage() {
  return <OwnerSalesmenWorkspace />
}
