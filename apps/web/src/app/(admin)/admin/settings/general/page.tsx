import type { Metadata } from 'next'

import { AdminSettingsWorkspace } from '@/components/admin/admin-settings-workspace'

export const metadata: Metadata = { title: 'General settings', robots: { index: false } }

export default function AdminGeneralSettingsPage() {
  return <AdminSettingsWorkspace section="general" />
}
