import type { Metadata } from 'next'

import { AdminTradesWorkspace } from '@/components/admin/admin-trades-workspace'

export const metadata: Metadata = { title: 'Trades', robots: { index: false } }

/** Production trades desk — ledger-backed publish via admin trade API. */
export default function AdminTradesPage() {
  return <AdminTradesWorkspace />
}
