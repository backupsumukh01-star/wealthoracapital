import type { Metadata } from 'next'

import { AdminReportLibraryWorkspace } from '@/components/admin/admin-report-library-workspace'

export const metadata: Metadata = { title: 'Report library', robots: { index: false } }

export default function Page() {
  return <AdminReportLibraryWorkspace />
}
