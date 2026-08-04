import type { Metadata } from 'next'

import { ProfileWorkspace } from '@/components/dashboard/profile-workspace'

export const metadata: Metadata = { title: 'Profile', robots: { index: false } }

export default function ProfileSettingsPage() {
  return <ProfileWorkspace showHeader={false} />
}
