'use client'

import type { ReactNode } from 'react'

import { DEMO_SESSION } from '@/lib/dashboard-data'
import { SessionProvider } from '@/providers/session-provider'

/** Seeds the investor shell with realistic dummy session data until `/auth/me` exists. */
export function DemoSession({ children }: { children: ReactNode }) {
  return <SessionProvider session={DEMO_SESSION}>{children}</SessionProvider>
}
