import { MARKET_SYMBOLS, getSymbolConfig } from '../symbols.js'
import type { MarketDataProvider, ProviderQuote, ProviderQuotesResult } from './types.js'

const FETCH_TIMEOUT_MS = 8_000

/** In-memory prior forex prices for changePercent when the free APIs omit it. */
const forexPreviousPrices = new Map<string, number>()

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

function forexChangePercent(symbol: string, price: number): number {
  const previous = forexPreviousPrices.get(symbol)
  forexPreviousPrices.set(symbol, price)
  if (previous === undefined || previous === 0) return 0
  return ((price - previous) / previous) * 100
}

type FrankfurterResponse = {
  date?: string
  rates?: Record<string, number>
}

function toPairPrice(rate: number, invert: boolean): number {
  return invert ? 1 / rate : rate
}

function dayChangePercent(current: number, previous: number | undefined): number {
  if (!isFiniteNumber(previous) || previous <= 0) return 0
  return ((current - previous) / previous) * 100
}

async function fetchFrankfurterPrevious(
  dateIso: string | undefined,
): Promise<FrankfurterResponse | null> {
  if (!dateIso) return null
  const current = new Date(`${dateIso}T12:00:00.000Z`)
  if (Number.isNaN(current.getTime())) return null

  // Walk back up to 4 calendar days to skip weekends/holidays.
  for (let i = 1; i <= 4; i += 1) {
    const d = new Date(current)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    const prev = await fetchJson<FrankfurterResponse>(
      `https://api.frankfurter.app/${key}?from=USD&to=EUR,GBP,JPY,AUD,NZD`,
    )
    if (prev?.rates && prev.date && prev.date !== dateIso) return prev
  }
  return null
}

async function fetchForexQuotes(): Promise<ProviderQuote[]> {
  const data = await fetchJson<FrankfurterResponse>(
    'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,NZD',
  )
  if (!data?.rates) return []

  const previous = await fetchFrankfurterPrevious(data.date)

  const quotes: ProviderQuote[] = []
  const pairs: Array<{ symbol: string; quoteCurrency: string; invert: boolean }> = [
    { symbol: 'EUR/USD', quoteCurrency: 'EUR', invert: true },
    { symbol: 'GBP/USD', quoteCurrency: 'GBP', invert: true },
    { symbol: 'USD/JPY', quoteCurrency: 'JPY', invert: false },
    { symbol: 'AUD/USD', quoteCurrency: 'AUD', invert: true },
    { symbol: 'NZD/USD', quoteCurrency: 'NZD', invert: true },
  ]

  for (const pair of pairs) {
    const config = getSymbolConfig(pair.symbol)
    const rate = data.rates[pair.quoteCurrency]
    if (!config || !isFiniteNumber(rate) || rate <= 0) continue

    const price = toPairPrice(rate, pair.invert)
    if (!isFiniteNumber(price) || price <= 0) continue

    const prevRate = previous?.rates?.[pair.quoteCurrency]
    const prevPrice =
      isFiniteNumber(prevRate) && prevRate > 0
        ? toPairPrice(prevRate, pair.invert)
        : undefined

    const changePercent = dayChangePercent(price, prevPrice)
    // Keep session fallback only when previous-day rates are unavailable.
    const resolvedChange =
      previous?.rates != null ? changePercent : forexChangePercent(pair.symbol, price)

    quotes.push({
      symbol: pair.symbol,
      price,
      changePercent: resolvedChange,
      previousClose: prevPrice,
      type: config.type,
      decimals: config.decimals,
    })
  }

  return quotes
}

type CoinGeckoResponse = Record<
  string,
  {
    usd?: number
    usd_24hr_change?: number
  }
>

async function fetchCryptoQuotes(): Promise<ProviderQuote[]> {
  const data = await fetchJson<CoinGeckoResponse>(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
  )
  if (!data) return []

  const mapping: Array<{ id: string; symbol: string }> = [
    { id: 'bitcoin', symbol: 'BTC/USD' },
    { id: 'ethereum', symbol: 'ETH/USD' },
  ]

  const quotes: ProviderQuote[] = []
  for (const entry of mapping) {
    const config = getSymbolConfig(entry.symbol)
    const row = data[entry.id]
    const price = row?.usd
    if (!config || !isFiniteNumber(price) || price <= 0) continue

    const change = row?.usd_24hr_change
    quotes.push({
      symbol: entry.symbol,
      price,
      changePercent: isFiniteNumber(change) ? change : 0,
      type: config.type,
      decimals: config.decimals,
    })
  }

  return quotes
}

type GoldApiResponse = {
  price?: number
}

async function fetchGoldQuote(): Promise<ProviderQuote[]> {
  const data = await fetchJson<GoldApiResponse>('https://api.gold-api.com/price/XAU')
  const config = getSymbolConfig('XAU/USD')
  const price = data?.price
  if (!config || !isFiniteNumber(price) || price <= 0) return []

  return [
    {
      symbol: 'XAU/USD',
      price,
      changePercent: forexChangePercent('XAU/USD', price),
      type: config.type,
      decimals: config.decimals,
    },
  ]
}

export class PublicMarketDataProvider implements MarketDataProvider {
  readonly name = 'public'

  async getQuotes(): Promise<ProviderQuotesResult> {
    const settled = await Promise.allSettled([
      fetchForexQuotes(),
      fetchCryptoQuotes(),
      fetchGoldQuote(),
    ])

    const quotes: ProviderQuote[] = []
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        quotes.push(...result.value)
      }
    }

    // Preserve configured symbol order; omit failures entirely.
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]))
    const ordered = MARKET_SYMBOLS.map((cfg) => bySymbol.get(cfg.symbol)).filter(
      (quote): quote is ProviderQuote => quote !== undefined,
    )

    const updatedAt = new Date().toISOString()
    if (ordered.length === 0) {
      return { status: 'OFFLINE', quotes: [], updatedAt }
    }

    return { status: 'DELAYED', quotes: ordered, updatedAt }
  }
}
