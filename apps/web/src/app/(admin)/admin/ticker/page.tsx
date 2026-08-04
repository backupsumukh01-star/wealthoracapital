import type { Metadata } from 'next'

import { AdminTickerWorkspace } from '@/components/admin/admin-ticker-workspace'

export const metadata: Metadata = { title: 'Market ticker', robots: { index: false } }

export default function Page() {
  return <AdminTickerWorkspace />
}
