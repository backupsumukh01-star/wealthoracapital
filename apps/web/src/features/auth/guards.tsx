'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES, type Role, type StaffRole } from '@meridian/shared'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useSession } from '@/providers/session-provider'
import type { Permission } from '@/config/permissions.config'
import { ADMIN_ROUTE_PERMISSIONS } from '@/config/admin-route-permissions'
import { INVESTOR_ROUTE_PERMISSIONS } from '@/config/investor-route-permissions'

export { ProtectedRoute }

/**
 * Renders `children` only when the session carries one of `roles`.
 * UI hide only — API authorises independently.
 */
export function RoleGate({
  roles,
  children,
  fallback = null,
}: {
  roles: Role[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { role } = useSession()
  if (!role || !roles.includes(role)) return <>{fallback}</>
  return <>{children}</>
}

/** Guest-only surfaces (login/register) — UI hint; middleware also redirects. */
export function GuestGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAuthenticated } = useSession()
  if (isAuthenticated) return <>{fallback}</>
  return <>{children}</>
}

/** Any authenticated investor. */
export function InvestorGate({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return <ProtectedRoute fallback={fallback}>{children}</ProtectedRoute>
}

export function VerifiedInvestorGate({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const { session, isLoading } = useSession()
  if (isLoading) return <>{fallback}</>
  if (session?.user.kycStatus !== 'APPROVED') return <>{fallback}</>
  return <ProtectedRoute fallback={fallback}>{children}</ProtectedRoute>
}

/** Admin console presence gate — staff session required. */
export function AdminGate({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isStaff } = useSession()
  if (!isStaff) return <>{fallback}</>
  return <>{children}</>
}

export function StaffRoleGate({
  roles,
  children,
  fallback = null,
}: {
  roles: StaffRole[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isStaff, staffRole, role } = useSession()
  if (!isStaff) return <>{fallback}</>
  if (role === 'SUPER_ADMIN' || staffRole === 'SUPER_ADMIN') return <>{children}</>
  if (role === 'ADMIN' || staffRole === 'ADMIN') return <>{children}</>
  if (!staffRole || !roles.includes(staffRole)) return <>{fallback}</>
  return <>{children}</>
}

export function PermissionGate({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: Permission | string
  anyOf?: Array<Permission | string>
  children: ReactNode
  fallback?: ReactNode
}) {
  const { can, canAny } = useSession()
  const ok = anyOf?.length ? canAny(anyOf) : permission ? can(permission) : false
  if (!ok) return <>{fallback}</>
  return <>{children}</>
}

/**
 * Redirects away when the current admin path requires a permission the session lacks.
 * Mount once inside the admin layout.
 */
export function AdminPermissionRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isStaff, isLoading, canAny, can } = useSession()

  useEffect(() => {
    if (isLoading || !isStaff) return
    const required = matchAdminRoutePermission(pathname)
    if (!required) return
    const ok = Array.isArray(required) ? canAny(required) : can(required)
    if (!ok) {
      router.replace(ROUTES.admin.root)
    }
  }, [pathname, isLoading, isStaff, can, canAny, router])

  return <>{children}</>
}

/**
 * Redirects away when the current investor path requires a permission the session lacks.
 */
export function InvestorPermissionRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading, canAny, can, session, isStaff } = useSession()

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    const kycStatus = session?.user.kycStatus
    const isInvestor = session?.user.role === 'USER' && !isStaff
    if (isInvestor && kycStatus && kycStatus !== 'APPROVED') {
      if (pathname !== ROUTES.auth.onboarding) {
        router.replace(ROUTES.auth.onboarding)
      }
      return
    }
    const required = matchRoutePermission(pathname, INVESTOR_ROUTE_PERMISSIONS)
    if (!required) return
    const ok = Array.isArray(required) ? canAny(required) : can(required)
    if (!ok) {
      const fallback = ROUTES.dashboard.settings.profile
      if (pathname !== fallback) {
        router.replace(fallback)
      }
    }
  }, [pathname, isLoading, isAuthenticated, can, canAny, router, session, isStaff])

  return <>{children}</>
}

function matchAdminRoutePermission(pathname: string): string | string[] | null {
  return matchRoutePermission(pathname, ADMIN_ROUTE_PERMISSIONS)
}

function matchRoutePermission(
  pathname: string,
  map: Record<string, string | string[]>,
): string | string[] | null {
  const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, permission] of entries) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return permission
    }
  }
  return null
}
