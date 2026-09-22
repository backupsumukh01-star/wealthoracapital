import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminDeletedUsersWorkspace } from '@/components/admin/admin-deleted-users-workspace'

export const metadata: Metadata = { title: 'Deleted Users', robots: { index: false } }

export default function AdminDeletedUsersPage() {
  return (
    <Suspense fallback={<div className="text-caption text-fg-muted">Loading deleted users…</div>}>
      <AdminDeletedUsersWorkspace />
    </Suspense>
  )
}
