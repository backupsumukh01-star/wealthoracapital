import type { Metadata } from 'next'

import { PreferencesPanel } from '@/components/dashboard/preferences-panel'

export const metadata: Metadata = { title: 'Preferences', robots: { index: false } }

export default function PreferencesPage() {
  return <PreferencesPanel />
}
