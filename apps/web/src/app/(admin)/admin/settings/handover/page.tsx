import type { Metadata } from 'next'

import { AdminHandoverWorkspace } from '@/components/admin/admin-handover-workspace'

export const metadata: Metadata = {
  title: 'Client Handover Reset',
  robots: { index: false },
}

export default function AdminHandoverSettingsPage() {
  return <AdminHandoverWorkspace />
}
