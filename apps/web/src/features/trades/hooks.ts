'use client'

/** Trade hooks. Filters are part of the key so each filtered view caches separately. */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
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
  publicPage: (limit?: number) => [...tradeQueryKeys.all, 'public-page', limit ?? 50] as const,
  publicStats: () => [...tradeQueryKeys.all, 'public-stats'] as const,
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

/** Public (unauthenticated) desk trade stats for marketing. */
export function usePublicTradeStats(options?: QueryHookOptions) {
  return useQuery({
    queryKey: tradeQueryKeys.publicStats(),
    queryFn: () => tradesApi.publicStats(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** Marketing/track-record surface — no auth required (first page). */
export function usePublicTrades(options?: QueryHookOptions & { limit?: number }) {
  const limit = options?.limit ?? 50
  return useQuery<Trade[]>({
    queryKey: [...tradeQueryKeys.public(), limit],
    queryFn: async () => {
      const page = await tradesApi.publicList({ limit })
      return page.items
    },
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** Infinite public trade blotter for Historical Performance. */
export function usePublicTradesInfinite(options?: QueryHookOptions & { limit?: number }) {
  const limit = options?.limit ?? 40
  return useInfiniteQuery({
    queryKey: tradeQueryKeys.publicPage(limit),
    queryFn: ({ pageParam }) =>
      tradesApi.publicList({
        limit,
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  })
}
