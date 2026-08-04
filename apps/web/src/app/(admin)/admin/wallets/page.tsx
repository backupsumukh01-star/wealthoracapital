import type { Metadata } from 'next'

import { AdminWalletManagerWorkspace } from '@/components/admin/admin-wallet-manager-workspace'

export const metadata: Metadata = { title: 'Wallets', robots: { index: false } }

export default function Page() {
  return <AdminWalletManagerWorkspace />
}
