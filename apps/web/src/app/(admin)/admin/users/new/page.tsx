import type { Metadata } from 'next'

import { AdminCreateUserWorkspace } from '@/components/admin/admin-create-user-workspace'

export const metadata: Metadata = { title: 'Create user', robots: { index: false } }

export default function AdminCreateUserPage() {
  return <AdminCreateUserWorkspace />
}
