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
  const { data, isLoading, isFetching, isError, refetch, failureReason } = useAuthSession()

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

  // Soft re-check when tab becomes visible — do not clear session on transient failures.
  useEffect(() => {
    let last = 0
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - last < 60_000) return
      last = now
      void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetch])

  const value = useMemo<SessionContextValue>(() => {
    const session = (data === undefined ? seedSession : data) as Session | null
    const role = session?.user.role ?? null
    const staffRole = (session?.user.staffRole ?? null) as StaffRole | null
    const permissions = session?.user.permissions ?? []
    const granted = new Set(permissions)
    // Only treat as logged-out when we have a definitive null session (401), not while
    // refetching or after a transient 429/5xx with placeholder data.
    const bootstrapping = isLoading && data === undefined && !seedSession
    const unauthorized =
      data === null ||
      (isError &&
        failureReason instanceof Error &&
        'status' in failureReason &&
        (failureReason as { status?: number }).status === 401)
    // First-load 429/5xx with no prior session — keep gate in loading, never bounce to login.
    const authUnknown =
      !unauthorized &&
      !session &&
      isError &&
      !(
        failureReason instanceof Error &&
        'status' in failureReason &&
        (failureReason as { status?: number }).status === 401
      )

    return {
      session: unauthorized ? null : session,
      isAuthenticated: Boolean(unauthorized ? null : session),
      role: unauthorized ? null : role,
      staffRole: unauthorized ? null : staffRole,
      permissions: unauthorized ? [] : permissions,
      isAdmin: !unauthorized && (role === 'ADMIN' || role === 'SUPER_ADMIN'),
      isStaff: !unauthorized && isStaffUser(role, staffRole),
      isLoading:
        bootstrapping ||
        authUnknown ||
        (isFetching && !session && !unauthorized),
      can: (permission) => {
        if (unauthorized || !permission) return false
        if (isPermission(permission) || typeof permission === 'string') {
          return granted.has(permission)
        }
        return false
      },
      canAny: (list) => (!unauthorized ? list.some((p) => granted.has(p)) : false),
      refresh,
      setSession,
      clearSession,
    }
  }, [data, seedSession, isLoading, isFetching, isError, failureReason, refresh, setSession, clearSession])

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
