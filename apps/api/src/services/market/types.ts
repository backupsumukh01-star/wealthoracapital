export type MarketStatus = 'LIVE' | 'DELAYED' | 'OFFLINE'

export type MarketAssetType = 'forex' | 'metal' | 'crypto'

export type MarketQuote = {
  symbol: string
  price: string
  changePercent: string
  previousClose?: string
  type: MarketAssetType
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
