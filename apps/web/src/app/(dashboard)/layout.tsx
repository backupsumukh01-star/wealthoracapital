import type { ReactNode } from 'react'

import { DashboardProviders } from '@/components/dashboard/dashboard-providers'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

/**
 * Investor shell — protected routes, floating sidebar, sticky glass header, mobile bottom nav.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProviders>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProviders>
  )
}
