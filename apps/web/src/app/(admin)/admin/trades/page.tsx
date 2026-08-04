import type { Metadata } from 'next'

import { AdminTradeOsWorkspace } from '@/components/admin/admin-trade-os-workspace'

export const metadata: Metadata = { title: 'Trades', robots: { index: false } }

export default function AdminTradesPage() {
  return <AdminTradeOsWorkspace />
}
