import type { Metadata } from 'next'

import { AdminNotificationsWorkspace } from '@/components/admin/admin-notifications-workspace'

export const metadata: Metadata = { title: 'Notifications', robots: { index: false } }

export default function AdminNotificationsPage() {
  return <AdminNotificationsWorkspace />
}
