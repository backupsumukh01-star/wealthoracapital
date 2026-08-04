import type { Metadata } from 'next'

import { AdminDepositDetailWorkspace } from '@/components/admin/admin-deposit-detail'

export const metadata: Metadata = { title: 'Deposit review', robots: { index: false } }

export default function AdminDepositDetailPage() {
  return <AdminDepositDetailWorkspace />
}
