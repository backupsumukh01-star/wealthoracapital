import type { Metadata } from 'next'

import { AdminFrontendManagementWorkspace } from '@/components/admin/admin-frontend-management-workspace'

export const metadata: Metadata = {
  title: 'Frontend Management',
  robots: { index: false },
}

export default function Page() {
  return <AdminFrontendManagementWorkspace />
}
