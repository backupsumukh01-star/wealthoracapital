import type { Metadata } from 'next'

import { AdminFeatureTogglesWorkspace } from '@/components/admin/admin-feature-toggles-workspace'

export const metadata: Metadata = { title: 'Feature toggles', robots: { index: false } }

export default function Page() {
  return <AdminFeatureTogglesWorkspace />
}
