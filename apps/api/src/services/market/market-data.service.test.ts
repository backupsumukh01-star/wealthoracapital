import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  MarketDataService,
  formatChangePercent,
} from './market-data.service.js'
import type { MarketDataProvider, ProviderQuotesResult } from './providers/types.js'

function mockProvider(
  impl: () => Promise<ProviderQuotesResult>,
  name = 'mock',
): MarketDataProvider {
  return {
    name,
    getQuotes: impl,
  }
}

describe('formatChangePercent', () => {
  it('formats without double signs', () => {
    expect(formatChangePercent(0.12)).toBe('0.12')
    expect(formatChangePercent(-0.08)).toBe('-0.08')
    expect(formatChangePercent(0)).toBe('0.00')
    expect(formatChangePercent(-0)).toBe('0.00')
  })
})

describe('MarketDataService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats prices with symbol decimals', async () => {
    const provider = mockProvider(async () => ({
      status: 'DELAYED',
      updatedAt: '2026-08-10T12:00:00.000Z',
      quotes: [
        {
          symbol: 'EUR/USD',
          price: 1.085234,
          changePercent: 0.1234,
          type: 'forex',
          decimals: 5,
        },
        {
          symbol: 'USD/JPY',
          price: 149.1234,
          changePercent: -0.081,
          type: 'forex',
          decimals: 3,
        },
        {
          symbol: 'BTC/USD',
          price: 65123.456,
          changePercent: 1.5,
          type: 'crypto',
          decimals: 2,
        },
      ],
    }))

    const service = new MarketDataService({ provider, cacheTtlMs: 20_000 })
    const payload = await service.getQuotes()

    expect(payload.status).toBe('DELAYED')
    expect(payload.quotes).toEqual([
      {
        symbol: 'EUR/USD',
        price: '1.08523',
        changePercent: '0.12',
        type: 'forex',
        decimals: 5,
      },
      {
        symbol: 'USD/JPY',
        price: '149.123',
        changePercent: '-0.08',
        type: 'forex',
        decimals: 3,
      },
      {
        symbol: 'BTC/USD',
        price: '65123.46',
        changePercent: '1.50',
        type: 'crypto',
        decimals: 2,
      },
    ])
  })

  it('returns OFFLINE without inventing prices on failure', async () => {
    const provider = mockProvider(async () => {
      throw new Error('upstream down')
    })

    const service = new MarketDataService({ provider, cacheTtlMs: 20_000 })
    const payload = await service.getQuotes()

    expect(payload.status).toBe('OFFLINE')
    expect(payload.quotes).toEqual([])
    expect(payload.message).toBe('Market data unavailable')
  })

  it('returns OFFLINE when provider yields no quotes', async () => {
    const provider = mockProvider(async () => ({
      status: 'OFFLINE',
      updatedAt: '2026-08-10T12:00:00.000Z',
      quotes: [],
    }))

    const service = new MarketDataService({ provider, cacheTtlMs: 20_000 })
    const payload = await service.getQuotes()

    expect(payload.status).toBe('OFFLINE')
    expect(payload.quotes).toEqual([])
    expect(payload.message).toBe('Market data unavailable')
  })

  it('returns cached quotes as DELAYED when a later fetch fails', async () => {
    let calls = 0
    const provider = mockProvider(async () => {
      calls += 1
      if (calls === 1) {
        return {
          status: 'LIVE',
          updatedAt: '2026-08-10T12:00:00.000Z',
          quotes: [
            {
              symbol: 'EUR/USD',
              price: 1.1,
              changePercent: 0.5,
              type: 'forex',
              decimals: 5,
            },
          ],
        }
      }
      throw new Error('provider failure')
    })

    const service = new MarketDataService({ provider, cacheTtlMs: 1 })
    const first = await service.getQuotes()
    expect(first.status).toBe('LIVE')
    expect(first.quotes).toHaveLength(1)
    expect(first.quotes[0]?.price).toBe('1.10000')

    // Expire TTL so the next call re-fetches.
    await new Promise((resolve) => setTimeout(resolve, 5))

    const second = await service.getQuotes()
    expect(second.status).toBe('DELAYED')
    expect(second.quotes).toHaveLength(1)
    expect(second.quotes[0]?.price).toBe('1.10000')
    expect(second.message).toMatch(/^Last updated /)
    expect(calls).toBe(2)
  })

  it('coalesces concurrent fetches (single-flight)', async () => {
    let calls = 0
    const provider = mockProvider(async () => {
      calls += 1
      await new Promise((resolve) => setTimeout(resolve, 30))
      return {
        status: 'DELAYED',
        updatedAt: '2026-08-10T12:00:00.000Z',
        quotes: [
          {
            symbol: 'ETH/USD',
            price: 3200,
            changePercent: -1.2,
            type: 'crypto',
            decimals: 2,
          },
        ],
      }
    })

    const service = new MarketDataService({ provider, cacheTtlMs: 20_000 })
    const [a, b, c] = await Promise.all([
      service.getQuotes(),
      service.getQuotes(),
      service.getQuotes(),
    ])

    expect(calls).toBe(1)
    expect(a.quotes[0]?.price).toBe('3200.00')
    expect(b.quotes[0]?.changePercent).toBe('-1.20')
    expect(c.status).toBe('DELAYED')
  })
})
