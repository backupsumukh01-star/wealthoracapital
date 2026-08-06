import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

import { ApiError } from './api-client'
import { QUERY_STALE_TIME } from './constants'

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: QUERY_STALE_TIME.normal,
    gcTime: 10 * 60 * 1000,
    // Focus/visibility refetches stacked with admin page mounts caused 429 storms.
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    networkMode: 'online',
    retry(failureCount, error) {
      // A 4xx is a decision, not a hiccup. Retrying it just delays the message.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
      // Network / 5xx — brief backoff, max 2 retries.
      return failureCount < 2
    },
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  },
  mutations: {
    // Mutations move money. A blind retry is exactly what idempotency keys exist to make safe,
    // so retries are opted into per-mutation rather than applied globally.
    retry: false,
    networkMode: 'online',
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
