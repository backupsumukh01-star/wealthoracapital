import type { Metadata } from 'next'

import { OwnerReportsWorkspace } from '@/components/sales/workspaces/owner-reports-workspace'

export const metadata: Metadata = { title: 'Sales reports', robots: { index: false } }

export default function OwnerReportsPage() {
  return <OwnerReportsWorkspace />
}
