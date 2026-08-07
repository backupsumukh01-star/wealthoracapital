import type { Metadata } from 'next'

import { AdminPerformanceLiveWorkspace } from '@/components/admin/admin-performance-live-workspace'

export const metadata: Metadata = { title: 'Performance', robots: { index: false } }

export default function AdminPerformancePage() {
  return <AdminPerformanceLiveWorkspace />
}
