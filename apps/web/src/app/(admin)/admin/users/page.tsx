import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminUsersWorkspace } from '@/components/admin/admin-users-workspace'

export const metadata: Metadata = { title: 'Users', robots: { index: false } }

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="text-caption text-fg-muted">Loading users…</div>}>
      <AdminUsersWorkspace />
    </Suspense>
  )
}
