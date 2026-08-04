import type { Metadata } from 'next'

import { AdminSettingsWorkspace } from '@/components/admin/admin-settings-workspace'

export const metadata: Metadata = { title: 'Security settings', robots: { index: false } }

export default function AdminSecuritySettingsPage() {
  return <AdminSettingsWorkspace section="security" />
}
