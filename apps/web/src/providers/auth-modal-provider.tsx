'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { AuthModal } from '@/components/auth/auth-modal'

export type AuthModalIntent = 'welcome' | 'login' | 'register'

type AuthModalContextValue = {
  open: boolean
  intent: AuthModalIntent
  openAuth: (intent?: AuthModalIntent) => void
  closeAuth: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [intent, setIntent] = useState<AuthModalIntent>('welcome')

  const openAuth = useCallback((next: AuthModalIntent = 'welcome') => {
    setIntent(next)
    setOpen(true)
  }, [])

  const closeAuth = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ open, intent, openAuth, closeAuth }),
    [open, intent, openAuth, closeAuth],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        intent={intent}
        onOpenChange={(v) => {
          if (!v) closeAuth()
          else setOpen(true)
        }}
      />
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider')
  return ctx
}
