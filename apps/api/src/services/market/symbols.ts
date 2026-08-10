import type { MarketAssetType } from './types.js'

export type MarketSymbolConfig = {
  symbol: string
  type: MarketAssetType
  decimals: number
  /** Finnhub (or other keyed provider) symbol when applicable */
  providerSymbol?: string
}

export const MARKET_SYMBOLS: readonly MarketSymbolConfig[] = [
  { symbol: 'EUR/USD', type: 'forex', decimals: 5, providerSymbol: 'OANDA:EUR_USD' },
  { symbol: 'GBP/USD', type: 'forex', decimals: 5, providerSymbol: 'OANDA:GBP_USD' },
  { symbol: 'USD/JPY', type: 'forex', decimals: 3, providerSymbol: 'OANDA:USD_JPY' },
  { symbol: 'AUD/USD', type: 'forex', decimals: 5, providerSymbol: 'OANDA:AUD_USD' },
  { symbol: 'NZD/USD', type: 'forex', decimals: 5, providerSymbol: 'OANDA:NZD_USD' },
  { symbol: 'XAU/USD', type: 'metal', decimals: 2, providerSymbol: 'OANDA:XAU_USD' },
  { symbol: 'BTC/USD', type: 'crypto', decimals: 2, providerSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'ETH/USD', type: 'crypto', decimals: 2, providerSymbol: 'BINANCE:ETHUSDT' },
] as const

export function getSymbolConfig(symbol: string): MarketSymbolConfig | undefined {
  return MARKET_SYMBOLS.find((entry) => entry.symbol === symbol)
}
