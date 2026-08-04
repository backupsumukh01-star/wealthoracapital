import type { Metadata } from 'next'

import { AdminBackupWorkspace } from '@/components/admin/admin-site-settings-workspace'

export const metadata: Metadata = { title: 'Backup', robots: { index: false } }

export default function Page() {
  return <AdminBackupWorkspace />
}
