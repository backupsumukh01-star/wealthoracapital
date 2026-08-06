import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

import { ApiError } from './api-client'
import { QUERY_STALE_TIME } from './constants'

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: QUERY_STALE_TIME.normal,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry(failureCount, error) {
      // A 4xx is a decision, not a hiccup. Retrying it just delays the message.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
      return failureCount < 2
    },
  },
  mutations: {
    // Mutations move money. A blind retry is exactly what idempotency keys exist to make safe,
    // so retries are opted into per-mutation rather than applied globally.
    retry: false,
  },
}

export function createQueryClient() {
  return new QueryClient({ defaultOptions })
}

/** Shared shape for optional query-hook params — lets callers gate a fetch behind auth/route state. */
export interface QueryHookOptions {
  enabled?: boolean
  refetchInterval?: number | false
}
