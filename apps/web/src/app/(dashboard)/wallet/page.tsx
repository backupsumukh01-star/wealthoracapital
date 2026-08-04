import type { Metadata } from 'next'
import { Suspense } from 'react'

import { WalletCenter } from '@/components/wallet/wallet-center'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Wallet', robots: { index: false } }

function WalletFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<WalletFallback />}>
      <WalletCenter />
    </Suspense>
  )
}
