import type { Metadata } from 'next'

import { AdminTradeDetail } from '@/components/admin/admin-trade-detail'

export const metadata: Metadata = { title: 'Trade detail', robots: { index: false } }

export default function AdminTradeDetailPage() {
  return <AdminTradeDetail />
}
