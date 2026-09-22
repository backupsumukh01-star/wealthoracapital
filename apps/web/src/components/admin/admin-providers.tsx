'use client'

import type { ReactNode } from 'react'

import { AdminOsProvider } from '@/providers/admin-os-provider'

/** Admin-only provider shell — keeps Admin OS off the public marketing bundle. */
export function AdminProviders({ children }: { children: ReactNode }) {
  return <AdminOsProvider>{children}</AdminOsProvider>
}
