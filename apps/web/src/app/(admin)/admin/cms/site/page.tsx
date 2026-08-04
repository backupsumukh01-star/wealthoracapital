import type { Metadata } from 'next'

import { AdminSiteSettingsWorkspace } from '@/components/admin/admin-site-settings-workspace'

export const metadata: Metadata = { title: 'Site settings', robots: { index: false } }

export default function Page() {
  return <AdminSiteSettingsWorkspace />
}
