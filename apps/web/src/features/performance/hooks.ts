'use client'

/** Performance hooks. These figures change once a day, so they use the slow stale time. */

import { useMutation, useQuery } from '@tanstack/react-query'
import type { EquityPoint, PerformanceSummary, ProfitDistribution } from '@meridian/shared'

import { performanceApi } from './api'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'
import type { PublicPerformancePayload } from '@/types/domain'

export type { PublicPerformancePayload }

export const performanceQueryKeys = {
  all: ['performance'] as const,
  summary: () => [...performanceQueryKeys.all, 'summary'] as const,
  series: (range?: string) => [...performanceQueryKeys.all, 'series', range ?? 'all'] as const,
  monthly: () => [...performanceQueryKeys.all, 'monthly'] as const,
  yearly: () => [...performanceQueryKeys.all, 'yearly'] as const,
  distributions: (filters?: Record<string, unknown>) =>
    [...performanceQueryKeys.all, 'distributions', filters ?? {}] as const,
  public: () => [...performanceQueryKeys.all, 'public'] as const,
}

/** ROI, this/last month return, best/worst day, win rate — the investor performance headline. */
export function usePerformanceSummary(options?: QueryHookOptions) {
  return useQuery<PerformanceSummary>({
    queryKey: performanceQueryKeys.summary(),
    queryFn: () => performanceApi.performanceSummary(),
    staleTime: QUERY_STALE_TIME.slow,
    enabled: options?.enabled,
  })
}

/** Equity curve for the chart. `range` (e.g. `'30d' | '90d' | 'ytd' | 'all'`) is part of the key. */
export function usePerformanceSeries(range: string, options?: QueryHookOptions) {
  return useQuery<{ range: string; points: EquityPoint[] }>({
    queryKey: performanceQueryKeys.series(range),
    queryFn: () => performanceApi.series(range),
    staleTime: QUERY_STALE_TIME.slow,
    enabled: options?.enabled,
  })
}

export function usePerformanceMonthly(options?: QueryHookOptions) {
  return useQuery<Array<{ month: string; returnPct: string; profit: string }>>({
    queryKey: performanceQueryKeys.monthly(),
    queryFn: () => performanceApi.monthly(),
    staleTime: QUERY_STALE_TIME.slow,
    enabled: options?.enabled,
  })
}

export function usePerformanceDistributions(options?: QueryHookOptions) {
  return useQuery<{ items: ProfitDistribution[] }>({
    queryKey: performanceQueryKeys.distributions(),
    queryFn: () => performanceApi.distributions(),
    staleTime: QUERY_STALE_TIME.slow,
    enabled: options?.enabled,
  })
}

/** Marketing/track-record surface — no auth required. */
export function usePublicPerformance(options?: QueryHookOptions) {
  return useQuery<PublicPerformancePayload>({
    queryKey: performanceQueryKeys.public(),
    queryFn: () => performanceApi.publicPerformance(),
    staleTime: QUERY_STALE_TIME.slow,
    enabled: options?.enabled,
  })
}

/**
 * Monthly series for marketing pages. Reads the unauthenticated public payload so
 * signed-out visitors are not sent to the authenticated `/performance/monthly`.
 */
export function usePublicPerformanceMonthly(options?: QueryHookOptions) {
  const query = usePublicPerformance(options)
  return { ...query, data: query.data?.monthly ?? [] }
}

/** Kicks off an async CSV/XLSX/PDF export job; the caller polls or follows `downloadUrl`. */
export function useExportPerformanceReport() {
  return useMutation<
    { jobId: string; downloadUrl?: string },
    Error,
    { type: string; from: string; to: string; format: 'CSV' | 'XLSX' | 'PDF'; filters?: Record<string, string> }
  >({
    mutationFn: (body) => performanceApi.export(body),
  })
}
