import { env } from '../../config/env.js'
import type { MarketQuote, MarketQuotesPayload, MarketStatusPayload } from './types.js'
import { FinnhubMarketDataProvider } from './providers/finnhub.provider.js'
import { PublicMarketDataProvider } from './providers/public.provider.js'
import type { MarketDataProvider, ProviderQuote } from './providers/types.js'

const STALE_CACHE_MAX_MS = 5 * 60 * 1000

type CacheEntry = {
  payload: MarketQuotesPayload
  storedAt: number
}

function formatPrice(price: number, decimals: number): string {
  return price.toFixed(decimals)
}

/** Format percent without double signs (e.g. "0.12", "-0.08"). */
export function formatChangePercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00'
  const rounded = Math.round(value * 100) / 100
  if (Object.is(rounded, -0) || Math.abs(rounded) < 0.005) return '0.00'
  const formatted = rounded.toFixed(2)
  if (formatted === '-0.00') return '0.00'
  return formatted.startsWith('+') ? formatted.slice(1) : formatted
}

function formatQuote(raw: ProviderQuote): MarketQuote {
  const quote: MarketQuote = {
    symbol: raw.symbol,
    price: formatPrice(raw.price, raw.decimals),
    changePercent: formatChangePercent(raw.changePercent),
    type: raw.type,
    decimals: raw.decimals,
  }
  if (raw.previousClose !== undefined && Number.isFinite(raw.previousClose)) {
    quote.previousClose = formatPrice(raw.previousClose, raw.decimals)
  }
  return quote
}

function asOfLabelFor(status: MarketQuotesPayload['status'], updatedAt: string): string {
  const time = new Date(updatedAt)
  const timeLabel = Number.isNaN(time.getTime())
    ? updatedAt
    : time.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })

  if (status === 'LIVE') return `Live · ${timeLabel}`
  if (status === 'DELAYED') return `Delayed · ${timeLabel}`
  return 'Market data unavailable'
}

function lastUpdatedMessage(updatedAt: string): string {
  const time = new Date(updatedAt)
  const label = Number.isNaN(time.getTime()) ? updatedAt : time.toLocaleString('en-US')
  return `Last updated ${label}`
}

function resolveProvider(override?: MarketDataProvider): MarketDataProvider {
  if (override) return override
  if (env.MARKET_DATA_PROVIDER === 'finnhub' && env.MARKET_DATA_API_KEY.trim()) {
    return new FinnhubMarketDataProvider(env.MARKET_DATA_API_KEY.trim())
  }
  return new PublicMarketDataProvider()
}

export class MarketDataService {
  private cache: CacheEntry | null = null
  private inflight: Promise<MarketQuotesPayload> | null = null
  private readonly provider: MarketDataProvider
  private readonly cacheTtlMs: number

  constructor(options?: { provider?: MarketDataProvider; cacheTtlMs?: number }) {
    this.provider = resolveProvider(options?.provider)
    this.cacheTtlMs = options?.cacheTtlMs ?? env.MARKET_DATA_CACHE_TTL_MS
  }

  getProviderName(): string {
    return this.provider.name
  }

  async getQuotes(): Promise<MarketQuotesPayload> {
    const now = Date.now()
    if (this.cache && now - this.cache.storedAt < this.cacheTtlMs) {
      return this.cache.payload
    }

    if (this.inflight) {
      return this.inflight
    }

    this.inflight = this.fetchFresh()
      .catch((error: unknown) => this.handleFetchFailure(error, now))
      .finally(() => {
        this.inflight = null
      })

    return this.inflight
  }

  async getStatus(): Promise<MarketStatusPayload> {
    const payload = await this.getQuotes()
    return {
      status: payload.status,
      updatedAt: payload.updatedAt,
      asOfLabel: payload.asOfLabel,
      message: payload.message,
      provider: this.provider.name,
    }
  }

  /** Test helper — clear in-memory cache between cases. */
  clearCache(): void {
    this.cache = null
  }

  private async fetchFresh(): Promise<MarketQuotesPayload> {
    const result = await this.provider.getQuotes()
    const quotes = result.quotes
      .filter((quote) => Number.isFinite(quote.price) && quote.price > 0)
      .map(formatQuote)

    const status =
      quotes.length === 0 ? 'OFFLINE' : result.status === 'LIVE' ? 'LIVE' : 'DELAYED'

    const payload: MarketQuotesPayload = {
      status,
      updatedAt: result.updatedAt || new Date().toISOString(),
      asOfLabel: asOfLabelFor(status, result.updatedAt || new Date().toISOString()),
      quotes,
      ...(status === 'OFFLINE'
        ? { message: 'Market data unavailable' }
        : {}),
    }

    if (quotes.length > 0) {
      this.cache = { payload, storedAt: Date.now() }
    }

    return payload
  }

  private handleFetchFailure(_error: unknown, now: number): MarketQuotesPayload {
    if (this.cache && now - this.cache.storedAt < STALE_CACHE_MAX_MS) {
      return {
        ...this.cache.payload,
        status: 'DELAYED',
        asOfLabel: asOfLabelFor('DELAYED', this.cache.payload.updatedAt),
        message: lastUpdatedMessage(this.cache.payload.updatedAt),
      }
    }

    return {
      status: 'OFFLINE',
      updatedAt: new Date().toISOString(),
      asOfLabel: 'Market data unavailable',
      quotes: [],
      message: 'Market data unavailable',
    }
  }
}

export const marketDataService = new MarketDataService()
