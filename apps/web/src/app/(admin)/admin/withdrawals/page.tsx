import type { Metadata } from 'next'

import { AdminWithdrawalsWorkspace } from '@/components/admin/admin-withdrawals-workspace'

export const metadata: Metadata = { title: 'Withdrawals', robots: { index: false } }

export default function AdminWithdrawalsPage() {
  return <AdminWithdrawalsWorkspace />
}
