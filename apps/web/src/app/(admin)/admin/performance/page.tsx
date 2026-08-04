import type { Metadata } from 'next'

import { AdminPerformanceCmsWorkspace } from '@/components/admin/admin-performance-cms-workspace'

export const metadata: Metadata = { title: 'Performance', robots: { index: false } }

export default function Page() {
  return <AdminPerformanceCmsWorkspace />
}
