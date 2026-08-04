import type { Metadata } from 'next'

import { AdminKycReviewWorkspace } from '@/components/admin/admin-kyc-review'

export const metadata: Metadata = { title: 'KYC review', robots: { index: false } }

export default function AdminKycReviewPage() {
  return <AdminKycReviewWorkspace />
}
