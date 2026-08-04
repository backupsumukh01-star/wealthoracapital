import type { Metadata } from 'next'

import { AdminPaymentsOsWorkspace } from '@/components/admin/admin-payments-os-workspace'

export const metadata: Metadata = { title: 'Payment methods', robots: { index: false } }

export default function AdminPaymentMethodsPage() {
  return <AdminPaymentsOsWorkspace />
}
