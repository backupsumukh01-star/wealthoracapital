import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminDepositsWorkspace } from '@/components/admin/admin-deposits-workspace'

export const metadata: Metadata = { title: 'Deposits', robots: { index: false } }

export default function AdminDepositsPage() {
  return (
    <Suspense fallback={<p className="text-caption text-fg-muted">Loading deposits…</p>}>
      <AdminDepositsWorkspace />
    </Suspense>
  )
}
