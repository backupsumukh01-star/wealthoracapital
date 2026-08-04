'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Role, User, Wallet } from '@meridian/shared'

/**
 * Holds the session the server already resolved, so client components can read the current user
 * without a second round trip and without flicker.
 *
 * Scaffold status: the layouts pass `null` until `/auth/me` exists. Nothing here is a security
 * control — the API re-verifies identity and role on every request (docs/08 §7).
 */
export interface Session {
  user: User
  wallet: Wallet | null
}

interface SessionContextValue {
  session: Session | null
  isAuthenticated: boolean
  role: Role | null
  isAdmin: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
  children,
  session = null,
}: {
  children: ReactNode
  session?: Session | null
}) {
  const value = useMemo<SessionContextValue>(() => {
    const role = session?.user.role ?? null
    return {
      session,
      isAuthenticated: session !== null,
      role,
      isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
    }
  }, [session])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return context
}
