import type { Metadata } from 'next'

import { AdminKycQueue } from '@/components/admin/admin-kyc-queue'

export const metadata: Metadata = { title: 'KYC queue', robots: { index: false } }

export default function AdminKycPage() {
  return <AdminKycQueue />
}
