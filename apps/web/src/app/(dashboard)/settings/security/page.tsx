import type { Metadata } from 'next'

import { SecuritySettingsPanel } from '@/components/dashboard/security-settings-panel'

export const metadata: Metadata = { title: 'Security settings', robots: { index: false } }

export default function SecuritySettingsPage() {
  return <SecuritySettingsPanel />
}
