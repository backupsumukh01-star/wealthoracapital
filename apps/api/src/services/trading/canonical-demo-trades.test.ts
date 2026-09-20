import { describe, expect, it } from 'vitest'

import {
  HISTORICAL_TRADES_DATASET,
  canonicalTradeStats,
  filterCanonicalTrades,
  findCanonicalTrade,
  loadCanonicalDemoTrades,
  mapCanonicalTrade,
  paginateMapped,
} from './canonical-demo-trades.js'

describe('canonical historical trade blotter', () => {
  it('loads one shared archive and filters by dummy start date without copying rows', () => {
    const all = loadCanonicalDemoTrades()
    expect(all.length).toBeGreaterThan(1000)
    expect(all[0]?.datasetVersion ?? HISTORICAL_TRADES_DATASET).toBe(HISTORICAL_TRADES_DATASET)

    const from2026 = filterCanonicalTrades({ fromDate: '2026-01-01' })
    const from2025 = filterCanonicalTrades({ fromDate: '2025-01-01' })
    expect(from2026.length).toBeGreaterThan(0)
    expect(from2025.length).toBeGreaterThan(from2026.length)
    expect(from2026.every((t) => t.tradeDate >= '2026-01-01')).toBe(true)
    expect(from2025.every((t) => t.tradeDate >= '2025-01-01')).toBe(true)
    expect(from2026.every((t) => all.some((row) => row.id === t.id))).toBe(true)
  })

  it('maps archive rows onto the investor Trade DTO', () => {
    const row = loadCanonicalDemoTrades()[0]
    expect(row).toBeTruthy()
    const mapped = mapCanonicalTrade(row!)
    expect(mapped.id).toBe(row!.id)
    expect(mapped.date).toBe(row!.tradeDate)
    expect(mapped.pair).toBe(row!.pair)
    expect(mapped.status).toBe('CLOSED')
    expect(String(mapped.notes || '').toLowerCase()).toContain('backtest')
    expect(findCanonicalTrade(row!.id)?.id).toBe(row!.id)
  })

  it('paginates without duplicating the archive', () => {
    const items = filterCanonicalTrades().slice(0, 5).map(mapCanonicalTrade)
    const page = paginateMapped(items, { limit: 2 })
    expect(page.items).toHaveLength(2)
    expect(page.nextCursor).toBe(page.items[1]?.id)
    const page2 = paginateMapped(items, { cursor: page.nextCursor!, limit: 2 })
    expect(page2.items[0]?.id).not.toBe(page.items[0]?.id)
  })

  it('computes stats from the canonical percentages', () => {
    const stats = canonicalTradeStats(loadCanonicalDemoTrades())
    expect(stats.tradeCount).toBeGreaterThan(1000)
    const wr = Number(stats.winRatePct)
    expect(wr).toBeGreaterThan(70)
    expect(wr).toBeLessThan(90)
  })
})
