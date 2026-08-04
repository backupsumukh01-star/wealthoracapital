import type { Metadata } from 'next'

import { AdminSupportWorkspace } from '@/components/admin/admin-support-workspace'

export const metadata: Metadata = { title: 'Support', robots: { index: false } }

export default function Page() {
  return <AdminSupportWorkspace />
}
