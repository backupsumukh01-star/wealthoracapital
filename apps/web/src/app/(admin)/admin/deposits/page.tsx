import type { Metadata } from 'next'

import { AdminDepositsWorkspace } from '@/components/admin/admin-deposits-workspace'

export const metadata: Metadata = { title: 'Deposits', robots: { index: false } }

export default function AdminDepositsPage() {
  return <AdminDepositsWorkspace />
}
