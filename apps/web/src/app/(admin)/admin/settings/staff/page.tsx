import type { Metadata } from 'next'

import { AdminSettingsWorkspace } from '@/components/admin/admin-settings-workspace'

export const metadata: Metadata = { title: 'Staff', robots: { index: false } }

export default function AdminStaffPage() {
  return <AdminSettingsWorkspace section="staff" />
}
