'use client'

import { useQuery } from '@tanstack/react-query'

import {
  marketService,
  type MarketQuotesPayload,
  type MarketStatusPayload,
} from '@/services/market.service'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'

export const marketQueryKeys = {
  all: ['markets'] as const,
  quotes: () => [...marketQueryKeys.all, 'quotes'] as const,
  status: () => [...marketQueryKeys.all, 'status'] as const,
}

/** Shared market quotes — one React Query cache for ticker, cards, dashboard, admin. */
export function useMarketQuotes(options?: QueryHookOptions) {
  return useQuery<MarketQuotesPayload>({
    queryKey: marketQueryKeys.quotes(),
    queryFn: () => marketService.quotes(),
    staleTime: QUERY_STALE_TIME.fast,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled,
  })
}

export function useMarketStatus(options?: QueryHookOptions) {
  return useQuery<MarketStatusPayload>({
    queryKey: marketQueryKeys.status(),
    queryFn: () => marketService.status(),
    staleTime: QUERY_STALE_TIME.fast,
    refetchInterval: 20_000,
    enabled: options?.enabled,
  })
}

/** Display helpers shared by ticker / cards (no double signs). */
export function formatMarketChangePct(raw: string): {
  text: string
  tone: 'up' | 'down' | 'neutral'
} {
  const n = Number.parseFloat(String(raw).replace(/%/g, ''))
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) {
    return { text: '0.00%', tone: 'neutral' }
  }
  if (n > 0) return { text: `+${Math.abs(n).toFixed(2)}%`, tone: 'up' }
  return { text: `-${Math.abs(n).toFixed(2)}%`, tone: 'down' }
}

export function marketStatusBadge(status: MarketQuotesPayload['status'] | undefined): {
  label: string
  live: boolean
} {
  if (status === 'LIVE') return { label: 'Live', live: true }
  if (status === 'DELAYED') return { label: 'Delayed', live: false }
  return { label: 'Offline', live: false }
}
