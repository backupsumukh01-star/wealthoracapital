import type { Metadata } from 'next'

import { AdminSettingsWorkspace } from '@/components/admin/admin-settings-workspace'

export const metadata: Metadata = { title: 'Email templates', robots: { index: false } }

export default function AdminEmailTemplatesPage() {
  return <AdminSettingsWorkspace section="email" />
}
