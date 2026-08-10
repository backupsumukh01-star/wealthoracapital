import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'

export type MarketStatus = 'LIVE' | 'DELAYED' | 'OFFLINE'

export type MarketQuote = {
  symbol: string
  price: string
  changePercent: string
  previousClose?: string
  type: 'forex' | 'metal' | 'crypto'
  decimals: number
}

export type MarketQuotesPayload = {
  status: MarketStatus
  updatedAt: string
  asOfLabel?: string
  quotes: MarketQuote[]
  message?: string
}

export type MarketStatusPayload = {
  status: MarketStatus
  updatedAt: string
  asOfLabel?: string
  message?: string
  provider: string
}

/** Centralized market quotes — always from our API (never provider keys in the browser). */
export const marketService = {
  quotes: () => apiClient<MarketQuotesPayload>(API_ROUTES.markets.quotes),
  status: () => apiClient<MarketStatusPayload>(API_ROUTES.markets.status),
}
