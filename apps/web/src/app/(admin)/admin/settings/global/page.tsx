import type { Metadata } from 'next'

import { AdminGlobalSettingsWorkspace } from '@/components/admin/admin-global-settings-workspace'

export const metadata: Metadata = { title: 'Global settings', robots: { index: false } }

export default function Page() {
  return <AdminGlobalSettingsWorkspace />
}
