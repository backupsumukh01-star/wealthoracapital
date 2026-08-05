import {
  API_ROUTES,
  type DailyReturnRun,
  type EquityPoint,
  type PerformanceSummary,
  type ProfitDistribution,
} from '@meridian/shared'

import { apiClient } from './http'

export const reportService = {
  performanceSummary: () => apiClient<PerformanceSummary>(API_ROUTES.performance.summary),

  series: (range: string) =>
    apiClient<{ range: string; points: EquityPoint[] }>(
      `${API_ROUTES.performance.series}?range=${encodeURIComponent(range)}`,
    ),

  monthly: () => apiClient<Array<{ month: string; returnPct: string; profit: string }>>(
    API_ROUTES.performance.monthly,
  ),

  distributions: () =>
    apiClient<{ items: ProfitDistribution[] }>(API_ROUTES.performance.distributions),

  publicPerformance: () =>
    apiClient<import('@/types/domain').PublicPerformancePayload>(API_ROUTES.performance.public),

  export: (body: {
    type: string
    from: string
    to: string
    format: 'CSV' | 'XLSX' | 'PDF'
    filters?: Record<string, string>
  }) =>
    apiClient<{ jobId: string; downloadUrl?: string }>(API_ROUTES.reports.export, {
      method: 'POST',
      body,
    }),

  dailyReturnRuns: () =>
    apiClient<{ items: DailyReturnRun[] }>(API_ROUTES.admin.returns),
}
