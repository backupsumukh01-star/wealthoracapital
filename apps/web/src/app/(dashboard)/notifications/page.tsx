import type { Metadata } from 'next'

import { NotificationsWorkspace } from '@/components/dashboard/notifications-workspace'

export const metadata: Metadata = { title: 'Notifications', robots: { index: false } }

export default function NotificationsPage() {
  return <NotificationsWorkspace />
}
