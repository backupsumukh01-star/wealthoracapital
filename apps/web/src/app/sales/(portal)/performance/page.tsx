import type { Metadata } from 'next'

import { SalesPerformanceWorkspace } from '@/components/sales/workspaces/sales-performance-workspace'

export const metadata: Metadata = { title: 'Performance', robots: { index: false } }

export default function SalesPerformancePage() {
  return <SalesPerformanceWorkspace />
}
