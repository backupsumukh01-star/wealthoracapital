import { API_ROUTES, type Trade } from '@meridian/shared'

import { apiClient } from './http'

export const tradeService = {
  list: (query?: { cursor?: string; outcome?: string }) => {
    const params = new URLSearchParams()
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.outcome) params.set('outcome', query.outcome)
    const qs = params.toString()
    return apiClient<{ items: Trade[]; nextCursor: string | null }>(
      `${API_ROUTES.trades.root}${qs ? `?${qs}` : ''}`,
    )
  },

  get: (id: string) => apiClient<Trade>(`${API_ROUTES.trades.root}/${id}`),

  pairs: () => apiClient<string[]>(API_ROUTES.trades.pairs),

  stats: () =>
    apiClient<{ winRatePct: string; tradeCount: number; avgReturnPct: string }>(
      API_ROUTES.trades.stats,
    ),

  publicList: () => apiClient<Trade[]>(`${API_ROUTES.trades.root}/public`),
}
