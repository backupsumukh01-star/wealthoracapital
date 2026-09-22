'use client'

import type { ReactNode } from 'react'

import { NotificationsProvider } from '@/providers/notifications-provider'

/** Investor dashboard notifications — not needed on marketing pages. */
export function DashboardProviders({ children }: { children: ReactNode }) {
  return <NotificationsProvider>{children}</NotificationsProvider>
}
