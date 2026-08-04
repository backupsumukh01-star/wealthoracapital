'use client'

import type { ReactNode } from 'react'
import { StaffRole, type Role } from '@meridian/shared'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { hasAdminSession } from '@/lib/demo-admin-auth'
import { hasDemoSession } from '@/lib/demo-auth'
import { useSession } from '@/providers/session-provider'
import type { Permission } from '@/config/permissions.config'

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
  if (typeof window !== 'undefined' && hasDemoSession()) return <>{fallback}</>
  return <>{children}</>
}

/** Any authenticated investor (demo cookie or session). */
export function InvestorGate({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return <ProtectedRoute fallback={fallback}>{children}</ProtectedRoute>
}

/**
 * Verified investor gate — when API is live, check `user.kycStatus === APPROVED`
 * and `emailVerified`. Demo: session cookie only.
 */
export function VerifiedInvestorGate({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return <ProtectedRoute fallback={fallback}>{children}</ProtectedRoute>
}

/** Admin console presence gate (demo admin cookie). */
export function AdminGate({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  if (typeof window !== 'undefined' && !hasAdminSession()) return <>{fallback}</>
  return <>{children}</>
}

/**
 * Staff role gate — prepared for JWT claims / `/admin/me`.
 * Demo: Super Admin path always allows when admin cookie present.
 */
export function StaffRoleGate({
  roles,
  children,
  fallback = null,
}: {
  roles: StaffRole[]
  children: ReactNode
  fallback?: ReactNode
}) {
  if (typeof window !== 'undefined' && !hasAdminSession()) return <>{fallback}</>
  // Until staff role is on the session, treat console operators as SUPER_ADMIN in demo.
  const current: StaffRole = StaffRole.SUPER_ADMIN
  if (!roles.includes(current)) return <>{fallback}</>
  return <>{children}</>
}

/**
 * Permission gate — prepared for RBAC matrix from `adminService.roles()`.
 * Demo: allow all when admin session exists.
 */
export function PermissionGate({
  permission: _permission,
  children,
  fallback = null,
}: {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  if (typeof window !== 'undefined' && !hasAdminSession()) return <>{fallback}</>
  return <>{children}</>
}
