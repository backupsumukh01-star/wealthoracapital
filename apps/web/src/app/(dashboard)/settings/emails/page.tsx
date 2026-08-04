import type { Metadata } from 'next'

import { EmailPreviewWorkspace } from '@/components/dashboard/email-preview-workspace'

export const metadata: Metadata = { title: 'Email preview' }

export default function EmailPreviewPage() {
  return <EmailPreviewWorkspace />
}
