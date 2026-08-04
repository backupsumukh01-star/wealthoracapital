import type { Metadata } from 'next'

import { AdminBroadcastWorkspace } from '@/components/admin/admin-broadcast-workspace'

export const metadata: Metadata = { title: 'Broadcast', robots: { index: false } }

export default function AdminBroadcastPage() {
  return <AdminBroadcastWorkspace />
}
