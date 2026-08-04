import type { Metadata } from 'next'

import { AdminWithdrawalDetailWorkspace } from '@/components/admin/admin-withdrawal-detail'

export const metadata: Metadata = { title: 'Withdrawal review', robots: { index: false } }

export default function AdminWithdrawalDetailPage() {
  return <AdminWithdrawalDetailWorkspace />
}
