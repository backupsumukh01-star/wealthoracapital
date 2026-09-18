import type { Metadata } from 'next'

import { SalesInvestmentsWorkspace } from '@/components/sales/workspaces/sales-investments-workspace'

export const metadata: Metadata = { title: 'Investments', robots: { index: false } }

export default function SalesInvestmentsPage() {
  return <SalesInvestmentsWorkspace />
}
