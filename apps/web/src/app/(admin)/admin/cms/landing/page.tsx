import type { Metadata } from 'next'

import { AdminLandingCmsWorkspace } from '@/components/admin/admin-landing-cms-workspace'

export const metadata: Metadata = { title: 'Landing CMS', robots: { index: false } }

export default function Page() {
  return <AdminLandingCmsWorkspace />
}
