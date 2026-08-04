import type { Metadata } from 'next'

import { AdminContentCmsWorkspace } from '@/components/admin/admin-content-cms-workspace'

export const metadata: Metadata = { title: 'Content CMS', robots: { index: false } }

export default function Page() {
  return <AdminContentCmsWorkspace />
}
