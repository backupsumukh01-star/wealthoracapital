import type { MarketAssetType, MarketStatus } from '../types.js'

/** Raw provider quote before display formatting. */
export type ProviderQuote = {
  symbol: string
  price: number
  changePercent: number
  previousClose?: number
  type: MarketAssetType
  decimals: number
}

export type ProviderQuotesResult = {
  status: MarketStatus
  quotes: ProviderQuote[]
  updatedAt: string
}

export interface MarketDataProvider {
  readonly name: string
  getQuotes(): Promise<ProviderQuotesResult>
}
