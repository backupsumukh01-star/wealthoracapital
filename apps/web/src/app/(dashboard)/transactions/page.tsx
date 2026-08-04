import type { Metadata } from 'next'

import { TransactionsWorkspace } from '@/components/dashboard/transactions-workspace'

export const metadata: Metadata = { title: 'Transactions', robots: { index: false } }

export default function TransactionsPage() {
  return <TransactionsWorkspace />
}
