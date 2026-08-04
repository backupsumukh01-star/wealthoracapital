import type { ReactNode } from 'react'

import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminCommandPalette } from '@/components/admin/admin-command-palette'
import { AdminSessionGate, AdminTopbar } from '@/components/admin/admin-topbar'
import { PageTransition } from '@/components/motion/page-transition'

/**
 * The operator shell.
 *
 * Role is enforced by the API on every request, not here. This layout only provides chrome that
 * makes it unmistakable which side of the platform the operator is on (docs/07 §Safeguards).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionGate>
      <div className="flex min-h-dvh bg-base">
        <AdminSidebar className="sticky top-0 hidden h-dvh lg:flex" />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <AdminCommandPalette />

          <main id="main" className="min-w-0 flex-1 overflow-x-clip px-4 py-6 lg:px-8 lg:py-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </AdminSessionGate>
  )
}
