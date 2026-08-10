import { MARKET_SYMBOLS } from '../symbols.js'
import type { MarketDataProvider, ProviderQuote, ProviderQuotesResult } from './types.js'
import { PublicMarketDataProvider } from './public.provider.js'

const FETCH_TIMEOUT_MS = 8_000
const FINNHUB_QUOTE_URL = 'https://finnhub.io/api/v1/quote'

type FinnhubQuoteResponse = {
  c?: number
  d?: number
  dp?: number
  pc?: number
  t?: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function fetchFinnhubQuote(
  providerSymbol: string,
  apiKey: string,
): Promise<FinnhubQuoteResponse | null> {
  const url = `${FINNHUB_QUOTE_URL}?symbol=${encodeURIComponent(providerSymbol)}&token=${encodeURIComponent(apiKey)}`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    return (await response.json()) as FinnhubQuoteResponse
  } catch {
    return null
  }
}

/**
 * Finnhub free tier typically returns crypto (BINANCE:*) and equities.
 * Forex / metals via OANDA often 403 — those symbols fall back to the public
 * delayed sources so tickers stay complete without inventing prices.
 */
export class FinnhubMarketDataProvider implements MarketDataProvider {
  readonly name = 'finnhub'
  private readonly publicFallback = new PublicMarketDataProvider()

  constructor(private readonly apiKey: string) {}

  async getQuotes(): Promise<ProviderQuotesResult> {
    const updatedAt = new Date().toISOString()
    const results = await Promise.all(
      MARKET_SYMBOLS.map(async (config): Promise<ProviderQuote | null> => {
        if (!config.providerSymbol) return null
        const data = await fetchFinnhubQuote(config.providerSymbol, this.apiKey)
        if (!data) return null

        const price = data.c
        if (!isFiniteNumber(price) || price <= 0) return null

        const changePercent = isFiniteNumber(data.dp) ? data.dp : 0
        const previousClose = isFiniteNumber(data.pc) && data.pc > 0 ? data.pc : undefined

        return {
          symbol: config.symbol,
          price,
          changePercent,
          previousClose,
          type: config.type,
          decimals: config.decimals,
        }
      }),
    )

    const liveQuotes = results.filter((quote): quote is ProviderQuote => quote !== null)
    const liveSymbols = new Set(liveQuotes.map((quote) => quote.symbol))
    const missing = MARKET_SYMBOLS.filter((cfg) => !liveSymbols.has(cfg.symbol))

    let quotes = liveQuotes
    let usedFallback = false

    if (missing.length > 0) {
      const fallback = await this.publicFallback.getQuotes()
      const bySymbol = new Map(fallback.quotes.map((quote) => [quote.symbol, quote]))
      const filled = missing
        .map((cfg) => bySymbol.get(cfg.symbol))
        .filter((quote): quote is ProviderQuote => quote != null)

      if (filled.length > 0) {
        usedFallback = true
        const merged = new Map(liveQuotes.map((quote) => [quote.symbol, quote]))
        for (const quote of filled) merged.set(quote.symbol, quote)
        quotes = MARKET_SYMBOLS.map((cfg) => merged.get(cfg.symbol)).filter(
          (quote): quote is ProviderQuote => quote != null,
        )
      }
    }

    if (quotes.length === 0) {
      return { status: 'OFFLINE', quotes: [], updatedAt }
    }

    // LIVE only when every configured symbol came from Finnhub (no public fill-in).
    const allLive = !usedFallback && liveQuotes.length === MARKET_SYMBOLS.length
    return {
      status: allLive ? 'LIVE' : 'DELAYED',
      quotes,
      updatedAt,
    }
  }
}
