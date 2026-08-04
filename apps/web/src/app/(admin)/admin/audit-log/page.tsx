import type { Metadata } from 'next'

import { AdminAuditWorkspace } from '@/components/admin/admin-audit-workspace'

export const metadata: Metadata = { title: 'Audit log', robots: { index: false } }

export default function AdminAuditLogPage() {
  return <AdminAuditWorkspace />
}
