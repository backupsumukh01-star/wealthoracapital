import type { Metadata } from 'next'

import { AdminSettingsWorkspace } from '@/components/admin/admin-settings-workspace'

export const metadata: Metadata = { title: 'Platform settings', robots: { index: false } }

export default function AdminPlatformSettingsPage() {
  return <AdminSettingsWorkspace section="platform" />
}
