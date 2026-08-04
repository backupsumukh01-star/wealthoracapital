import type { Metadata } from 'next'

import { SupportWorkspace } from '@/components/dashboard/support-workspace'

export const metadata: Metadata = { title: 'Support', robots: { index: false } }

export default function SupportPage() {
  return <SupportWorkspace />
}
