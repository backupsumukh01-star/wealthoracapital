import type { Metadata } from 'next'

import { AdminActivityWorkspace } from '@/components/admin/admin-activity-workspace'

export const metadata: Metadata = { title: 'Live activity', robots: { index: false } }

export default function Page() {
  return <AdminActivityWorkspace />
}
