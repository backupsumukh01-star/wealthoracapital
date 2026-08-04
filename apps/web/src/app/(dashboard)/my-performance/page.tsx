import type { Metadata } from 'next'

import { PerformanceWorkspace } from '@/components/dashboard/performance-workspace'

export const metadata: Metadata = { title: 'My performance', robots: { index: false } }

/**
 * Investor returns at `/my-performance` — marketing owns `/performance`.
 */
export default function MyPerformancePage() {
  return <PerformanceWorkspace />
}
