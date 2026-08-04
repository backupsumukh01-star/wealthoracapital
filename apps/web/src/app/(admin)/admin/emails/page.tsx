import type { Metadata } from 'next'

import { AdminEmailCenter } from '@/components/admin/admin-email-center'

export const metadata: Metadata = { title: 'Email center', robots: { index: false } }

export default function AdminEmailsPage() {
  return <AdminEmailCenter />
}
