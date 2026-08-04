'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { LoadingScreen } from '@/components/auth/loading-screen'
import { hasDemoSession } from '@/lib/demo-auth'

/**
 * Client-side route gate for authenticated investor surfaces.
 *
 * Complements middleware (cookie presence). Unauthenticated users are sent to Login
 * with `?next=` so they return after signing in. Replace `hasDemoSession` with
 * `/auth/me` when the API is connected.
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
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const ok = hasDemoSession()
    setAllowed(ok)
    setReady(true)
    if (!ok) {
      const next = encodeURIComponent(pathname || ROUTES.dashboard.root)
      router.replace(`${ROUTES.auth.login}?next=${next}`)
    }
  }, [pathname, router])

  if (!ready) return <>{fallback ?? <LoadingScreen label="Checking session…" />}</>
  if (!allowed) return <>{fallback ?? <LoadingScreen label="Redirecting to login…" />}</>
  return <>{children}</>
}
