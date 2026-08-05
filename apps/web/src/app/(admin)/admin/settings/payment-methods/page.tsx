import type { Metadata } from 'next'

import { AdminPaymentMethodsWorkspace } from '@/components/admin/admin-payment-methods-workspace'

export const metadata: Metadata = { title: 'Payment methods', robots: { index: false } }

export default function AdminPaymentMethodsPage() {
  return <AdminPaymentMethodsWorkspace />
}
