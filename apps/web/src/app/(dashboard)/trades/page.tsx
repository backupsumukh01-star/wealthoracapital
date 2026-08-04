import type { Metadata } from 'next'

import { TradeHistoryWorkspace } from '@/components/dashboard/trade-history-workspace'

export const metadata: Metadata = { title: 'Trade history', robots: { index: false } }

export default function TradesPage() {
  return <TradeHistoryWorkspace />
}
