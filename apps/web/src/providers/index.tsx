'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { MotionConfigProvider } from '@/components/motion/motion-config'
import { DeployVersionGuard } from '@/components/system/deploy-version-guard'
import { NetworkStatusBanner } from '@/components/system/network-status-banner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { QueryProvider } from './query-provider'
import { SessionProvider, type Session } from './session-provider'
import { ThemeProvider } from './theme-provider'

const LogoIntro = dynamic(
  () => import('@/components/brand/logo-intro').then((m) => m.LogoIntro),
  { ssr: false },
)

const ToastProvider = dynamic(
  () => import('./toast-provider').then((m) => m.ToastProvider),
  { ssr: false },
)

function IdleToastProvider() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    const go = () => {
      if (!cancelled) setReady(true)
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(go, { timeout: 2500 })
      return () => {
        cancelled = true
        w.cancelIdleCallback?.(id)
      }
    }
    const t = globalThis.setTimeout(go, 500)
    return () => {
      cancelled = true
      globalThis.clearTimeout(t)
    }
  }, [])
  if (!ready) return null
  return <ToastProvider />
}

/**
 * Root providers for every route.
 * Admin OS + investor notifications are scoped to their layouts — not the marketing homepage.
 */
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
          <MotionConfigProvider>
            <TooltipProvider delayDuration={200}>
              <DeployVersionGuard />
              <NetworkStatusBanner />
              <LogoIntro />
              {children}
              <IdleToastProvider />
            </TooltipProvider>
          </MotionConfigProvider>
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

export { useSession } from './session-provider'
export type { Session } from './session-provider'
export { useNotifications } from './notifications-provider'
export { useAdminOs } from './admin-os-provider'
