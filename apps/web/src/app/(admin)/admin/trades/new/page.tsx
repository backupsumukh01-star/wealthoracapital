import type { Metadata } from 'next'

import { AdminTradeForm } from '@/components/admin/admin-trade-form'

export const metadata: Metadata = { title: 'Record a trade', robots: { index: false } }

export default function AdminNewTradePage() {
  return <AdminTradeForm />
}
