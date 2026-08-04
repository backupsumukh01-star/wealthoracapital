import type { Metadata } from 'next'

import { PayoutMethodsPanel } from '@/components/dashboard/payout-methods-panel'

export const metadata: Metadata = { title: 'Payout methods', robots: { index: false } }

export default function PayoutMethodsPage() {
  return <PayoutMethodsPanel />
}
