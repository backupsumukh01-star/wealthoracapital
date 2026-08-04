'use client'

import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { createQueryClient } from '@/lib/query-client'

/**
 * One client per browser session, created inside state so React 19's strict-mode double render
 * and any server render never share a cache between users.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
