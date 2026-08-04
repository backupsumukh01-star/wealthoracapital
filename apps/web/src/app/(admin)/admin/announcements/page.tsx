import type { Metadata } from 'next'

import { AdminAnnouncementsWorkspace } from '@/components/admin/admin-activity-workspace'

export const metadata: Metadata = { title: 'Announcements', robots: { index: false } }

export default function Page() {
  return <AdminAnnouncementsWorkspace />
}
