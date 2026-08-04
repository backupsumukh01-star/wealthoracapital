import type { Metadata } from 'next'

import { AdminEmailTemplatesWorkspace } from '@/components/admin/admin-email-templates-workspace'

export const metadata: Metadata = { title: 'Email templates', robots: { index: false } }

export default function Page() {
  return <AdminEmailTemplatesWorkspace />
}
