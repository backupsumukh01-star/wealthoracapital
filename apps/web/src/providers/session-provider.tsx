'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Role, StaffRole, User, Wallet } from '@meridian/shared'

import { authQueryKeys, useAuthSession } from '@/features/auth/hooks'
import type { Permission } from '@/config/permissions.config'
import { isPermission } from '@/config/permissions.config'

/**
 * Holds the current investor/admin session, hydrated client-side from `GET /auth/me`.
 *
 * Nothing here is a security control — the API re-verifies identity and role on every
 * request. This context only decides what the UI renders.
 */
export interface Session {
  user: User
  wallet: Wallet | null
}

interface SessionContextValue {
  session: Session | null
  isAuthenticated: boolean
  role: Role | null
  staffRole: StaffRole | null
  permissions: string[]
  isAdmin: boolean
  /** Staff console access: ADMIN/SUPER_ADMIN role or any staffRole. */
  isStaff: boolean
  isLoading: boolean
  can: (permission: Permission | string) => boolean
  canAny: (permissions: Array<Permission | string>) => boolean
  refresh: () => void
  setSession: (session: Session | null) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function isStaffUser(role: Role | null, staffRole: StaffRole | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || staffRole !== null
}

export function SessionProvider({
  children,
  session: seedSession = null,
}: {
  children: ReactNode
  session?: Session | null
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useAuthSession()

  const setSession = useCallback(
    (next: Session | null) => {
      queryClient.setQueryData(authQueryKeys.session(), next)
    },
    [queryClient],
  )

  const clearSession = useCallback(() => setSession(null), [setSession])

  const refresh = useCallback(() => {
    void refetch()
  }, [refetch])

  // Re-fetch permissions when the tab regains focus so role changes take effect
  // without a full page reload (target sessions are already revoked server-side).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        void refetch()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refetch])

  const value = useMemo<SessionContextValue>(() => {
    const session = data === undefined ? seedSession : data
    const role = session?.user.role ?? null
    const staffRole = (session?.user.staffRole ?? null) as StaffRole | null
    const permissions = session?.user.permissions ?? []
    const granted = new Set(permissions)

    return {
      session,
      isAuthenticated: session !== null,
      role,
      staffRole,
      permissions,
      isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
      isStaff: isStaffUser(role, staffRole),
      isLoading,
      can: (permission) => {
        if (!permission) return false
        if (isPermission(permission) || typeof permission === 'string') {
          return granted.has(permission)
        }
        return false
      },
      canAny: (list) => list.some((p) => granted.has(p)),
      refresh,
      setSession,
      clearSession,
    }
  }, [data, seedSession, isLoading, refresh, setSession, clearSession])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return context
}

/** Convenience hook for permission checks. */
export function usePermission(permission: Permission | string) {
  const { can } = useSession()
  return can(permission)
}
