import type { Metadata } from 'next'

import { AdminMediaWorkspace } from '@/components/admin/admin-media-workspace'

export const metadata: Metadata = { title: 'Media Manager', robots: { index: false } }

export default function Page() {
  return <AdminMediaWorkspace />
}
