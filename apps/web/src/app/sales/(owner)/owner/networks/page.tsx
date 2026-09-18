import type { Metadata } from 'next'

import { OwnerNetworksIndexWorkspace } from '@/components/sales/workspaces/owner-networks-index-workspace'

export const metadata: Metadata = { title: 'Networks', robots: { index: false } }

export default function OwnerNetworksPage() {
  return <OwnerNetworksIndexWorkspace />
}
