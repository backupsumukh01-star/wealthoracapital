'use client'

/** Trade hooks. Filters are part of the key so each filtered view caches separately. */

import { useQuery } from '@tanstack/react-query'
import type { Trade } from '@meridian/shared'

import { tradesApi } from './api'
import type { QueryHookOptions } from '@/lib/query-client'

export const tradeQueryKeys = {
  all: ['trades'] as const,
  list: (filters?: Record<string, unknown>) => [...tradeQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...tradeQueryKeys.all, 'detail', id] as const,
  stats: (filters?: Record<string, unknown>) => [...tradeQueryKeys.all, 'stats', filters ?? {}] as const,
  pairs: () => [...tradeQueryKeys.all, 'pairs'] as const,
  public: () => [...tradeQueryKeys.all, 'public'] as const,
}

export function useTrades(query?: { cursor?: string; outcome?: string }, options?: QueryHookOptions) {
  return useQuery<{ items: Trade[]; nextCursor: string | null }>({
    queryKey: tradeQueryKeys.list(query),
    queryFn: () => tradesApi.list(query),
    enabled: options?.enabled,
  })
}

export function useTrade(id: string, options?: QueryHookOptions) {
  return useQuery<Trade>({
    queryKey: tradeQueryKeys.detail(id),
    queryFn: () => tradesApi.get(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

export function useTradePairs(options?: QueryHookOptions) {
  return useQuery<string[]>({
    queryKey: tradeQueryKeys.pairs(),
    queryFn: () => tradesApi.pairs(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** Aggregate win rate / trade count / avg return — changes as new trades publish. */
export function useTradeStats(options?: QueryHookOptions) {
  return useQuery<{ winRatePct: string; tradeCount: number; avgReturnPct: string }>({
    queryKey: tradeQueryKeys.stats(),
    queryFn: () => tradesApi.stats(),
    enabled: options?.enabled,
  })
}

/** Marketing/track-record surface — no auth required. */
export function usePublicTrades(options?: QueryHookOptions) {
  return useQuery<Trade[]>({
    queryKey: tradeQueryKeys.public(),
    queryFn: () => tradesApi.publicList(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  })
}
