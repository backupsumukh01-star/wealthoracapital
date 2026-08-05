'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { LoadingScreen } from '@/components/auth/loading-screen'
import { useSession } from '@/providers/session-provider'

/**
 * Client-side route gate for authenticated investor surfaces.
 *
 * Complements middleware (cookie presence). Reads the real session from `/auth/me` via
 * `useSession`; unauthenticated users are sent to Login with `?next=` so they return after
 * signing in.
 */
export function ProtectedRoute({
  children,
  fallback,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useSession()

  useEffect(() => {
    if (isLoading || isAuthenticated) return
    const next = encodeURIComponent(pathname || ROUTES.dashboard.root)
    router.replace(`${ROUTES.auth.login}?next=${next}`)
  }, [isLoading, isAuthenticated, pathname, router])

  if (isLoading) return <>{fallback ?? <LoadingScreen label="Checking session…" />}</>
  if (!isAuthenticated) return <>{fallback ?? <LoadingScreen label="Redirecting to login…" />}</>
  return <>{children}</>
}
