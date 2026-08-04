import type { Metadata } from 'next'

import { AdminSettingsWorkspace } from '@/components/admin/admin-settings-workspace'

export const metadata: Metadata = { title: 'Roles', robots: { index: false } }

export default function AdminRolesSettingsPage() {
  return <AdminSettingsWorkspace section="roles" />
}
