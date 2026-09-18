import type { Metadata } from 'next'

import { OwnerNetworkWorkspace } from '@/components/sales/workspaces/owner-network-workspace'

export const metadata: Metadata = { title: 'Salesman network', robots: { index: false } }

export default function OwnerSalesmanNetworkPage() {
  return <OwnerNetworkWorkspace />
}
