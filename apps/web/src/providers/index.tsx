'use client'

import type { ReactNode } from 'react'

import { LogoIntro } from '@/components/brand/logo-intro'
import { MotionConfigProvider } from '@/components/motion/motion-config'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AdminOsProvider } from './admin-os-provider'
import { NotificationsProvider } from './notifications-provider'
import { QueryProvider } from './query-provider'
import { SessionProvider, type Session } from './session-provider'
import { ThemeProvider } from './theme-provider'
import { ToastProvider } from './toast-provider'

/** One composition point, so the root layout stays a table of contents. */
export function Providers({
  children,
  session = null,
}: {
  children: ReactNode
  session?: Session | null
}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SessionProvider session={session}>
          <AdminOsProvider>
            <NotificationsProvider>
              <MotionConfigProvider>
                <TooltipProvider delayDuration={200}>
                  <LogoIntro />
                  {children}
                  <ToastProvider />
                </TooltipProvider>
              </MotionConfigProvider>
            </NotificationsProvider>
          </AdminOsProvider>
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

export { useSession } from './session-provider'
export type { Session } from './session-provider'
export { useNotifications } from './notifications-provider'
export { useAdminOs } from './admin-os-provider'
