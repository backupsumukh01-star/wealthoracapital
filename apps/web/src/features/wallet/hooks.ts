'use client'

/** Wallet hooks. Keys are fixed so invalidations from other features can reference them. */

import { useQuery } from '@tanstack/react-query'
import type { LedgerEntry, Wallet, WalletSummary } from '@meridian/shared'

import { walletApi } from './api'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'

export const walletQueryKeys = {
  all: ['wallet'] as const,
  summary: () => [...walletQueryKeys.all, 'summary'] as const,
  transactions: (filters?: Record<string, unknown>) =>
    [...walletQueryKeys.all, 'transactions', filters ?? {}] as const,
}

/** The investor's wallet — balance, locked funds, lifetime totals. Always fresh. */
export function useWallet(options?: QueryHookOptions) {
  return useQuery<Wallet>({
    queryKey: walletQueryKeys.all,
    queryFn: () => walletApi.get(),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.fast,
    refetchOnMount: 'always',
    refetchInterval: options?.refetchInterval,
  })
}

/** Dashboard aggregate: wallet + today's return + performance + recent trades in one call. */
export function useWalletSummary(options?: QueryHookOptions) {
  return useQuery<WalletSummary>({
    queryKey: walletQueryKeys.summary(),
    queryFn: () => walletApi.summary(),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.fast,
    refetchOnMount: 'always',
    refetchInterval: options?.refetchInterval,
  })
}

/** Ledger entries, cursor-paginated. Each distinct cursor/limit pair caches separately. */
export function useWalletTransactions(
  query?: { cursor?: string; limit?: number },
  options?: QueryHookOptions,
) {
  return useQuery<{ items: LedgerEntry[]; nextCursor: string | null }>({
    queryKey: walletQueryKeys.transactions(query),
    queryFn: () => walletApi.transactions(query),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.fast,
  })
}
