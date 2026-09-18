import type { Metadata } from 'next'

import { SalesNetworkWorkspace } from '@/components/sales/workspaces/sales-network-workspace'

export const metadata: Metadata = { title: 'My network', robots: { index: false } }

export default function SalesNetworkPage() {
  return <SalesNetworkWorkspace />
}
