import type { Metadata } from 'next'

import { TradeDetailWorkspace } from '@/components/dashboard/trade-detail-workspace'

export const metadata: Metadata = { title: 'Trade detail', robots: { index: false } }

export default function TradeDetailPage() {
  return <TradeDetailWorkspace />
}
