import type { ReactNode } from 'react'

import { AdminProviders } from '@/components/admin/admin-providers'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminCommandPalette } from '@/components/admin/admin-command-palette'
import { AdminSessionGate, AdminTopbar } from '@/components/admin/admin-topbar'
import { PageTransition } from '@/components/motion/page-transition'
import { AdminPermissionRouteGuard } from '@/features/auth/guards'

/**
 * The operator shell.
 *
 * Role is enforced by the API on every request. This layout hides unauthorized menus
 * and redirects away from routes the session cannot access.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProviders>
      <AdminSessionGate>
        <AdminPermissionRouteGuard>
          <div className="flex min-h-dvh bg-base">
            <AdminSidebar className="sticky top-0 hidden h-dvh lg:flex" />

            <div className="relative flex min-w-0 flex-1 flex-col">
              <div
                aria-hidden
                className="shrink-0"
                style={{ height: 'calc(var(--topbar-height) + env(safe-area-inset-top, 0px))' }}
              />
              <AdminTopbar />
              <AdminCommandPalette />

              <main
                id="main"
                className="relative z-0 min-w-0 flex-1 overflow-x-clip px-4 py-6 lg:px-8 lg:py-8"
              >
                <PageTransition>{children}</PageTransition>
              </main>
            </div>
          </div>
        </AdminPermissionRouteGuard>
      </AdminSessionGate>
    </AdminProviders>
  )
}
