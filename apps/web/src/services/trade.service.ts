import { API_ROUTES, type Trade } from '@meridian/shared'

import { apiClient } from './http'

export type PublicTradePage = {
  items: Trade[]
  nextCursor: string | null
}

export type PublicTradeStats = {
  winRatePct: string
  tradeCount: number
  avgReturnPct: string
  openTrades?: number
  closedTrades?: number
  bestTradeReturnPct?: string | null
  worstTradeReturnPct?: string | null
}

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

  publicStats: () => apiClient<PublicTradeStats>(`${API_ROUTES.trades.root}/public/stats`),

  publicList: async (query?: { cursor?: string; outcome?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.outcome) params.set('outcome', query.outcome)
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    const data = await apiClient<PublicTradePage | Trade[]>(
      `${API_ROUTES.trades.root}/public${qs ? `?${qs}` : ''}`,
    )
    if (Array.isArray(data)) {
      return { items: data, nextCursor: null as string | null }
    }
    return data
  },
}
