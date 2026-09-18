import type { Metadata } from 'next'

import { SalesProfileWorkspace } from '@/components/sales/workspaces/sales-profile-workspace'

export const metadata: Metadata = { title: 'Profile', robots: { index: false } }

export default function SalesProfilePage() {
  return <SalesProfileWorkspace />
}
