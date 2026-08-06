import type { Metadata } from 'next'

import { AdminDownloadsWorkspace } from '@/components/admin/admin-downloads-workspace'

export const metadata: Metadata = {
  title: 'Downloads / Reports',
  robots: { index: false },
}

export default function Page() {
  return <AdminDownloadsWorkspace />
}
