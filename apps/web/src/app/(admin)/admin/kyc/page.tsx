import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminKycQueue } from '@/components/admin/admin-kyc-queue'

export const metadata: Metadata = { title: 'KYC queue', robots: { index: false } }

export default function AdminKycPage() {
  return (
    <Suspense fallback={<p className="text-caption text-fg-muted">Loading KYC queue…</p>}>
      <AdminKycQueue />
    </Suspense>
  )
}
