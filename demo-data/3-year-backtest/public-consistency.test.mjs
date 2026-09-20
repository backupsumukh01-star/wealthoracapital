#!/usr/bin/env node
/**
 * Public website / report / trade archive consistency.
 * Does not regenerate datasets or touch finance ledgers.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const publicDir = path.join(repoRoot, 'apps/web/public/demo/backtest')
const apiTrades = path.join(repoRoot, 'apps/api/data/demo/trades.json')

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function readJson(file) {
  return JSON.parse(read(file))
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

test('canonical trade archive is one shared file for web, API, and CSV', () => {
  const web = readJson(path.join(publicDir, 'trades.json'))
  const api = readJson(apiTrades)
  assert.equal(web.length, api.length)
  assert.equal(web.length, 2567)
  assert.equal(sha256(path.join(publicDir, 'trades.json')), sha256(apiTrades))
  assert.equal(web[0].datasetVersion, 'wealthora-historical-trades-v1')
  assert.equal(web[0].tradeDate, '2022-09-01')
  assert.equal(web.at(-1).tradeDate, '2026-08-05')
  assert.equal(new Set(web.map((t) => t.id)).size, web.length)
  assert.ok(web.some((t) => t.direction === 'BUY'))
  assert.ok(web.some((t) => t.direction === 'SELL'))
  assert.ok(web.some((t) => t.outcome === 'WIN'))
  assert.ok(web.some((t) => t.outcome === 'LOSS'))
  const pairs = new Set(web.map((t) => t.pair))
  assert.ok(pairs.size >= 8)

  const csv = read(path.join(publicDir, 'trades.csv')).trim().split(/\r?\n/)
  assert.equal(csv.length - 1, web.length)

  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))
  assert.equal(stats.tradeCount, web.length)
  assert.equal(stats.endingEquity, 834.4)
  assert.equal(stats.totalReturnPct, 734.4)
})

test('Live Desk and dummy blotter load the same canonical archive', () => {
  const live = read(path.join(repoRoot, 'apps/web/src/components/marketing/live-trades-preview.tsx'))
  const dummy = read(path.join(repoRoot, 'apps/api/src/services/trading/canonical-demo-trades.ts'))
  const hero = read(path.join(repoRoot, 'apps/web/src/components/marketing/hero-visual.tsx'))
  assert.ok(live.includes('useDemoTrades'))
  assert.ok(live.includes('demoHistoryUsable'))
  assert.equal(live.includes('LIVE_TRADE_POOL'), false)
  assert.ok(dummy.includes('wealthora-historical-trades-v1'))
  assert.ok(dummy.includes('listInvestorCanonicalBlotter'))
  assert.ok(dummy.includes('isDemoInvestor'))
  assert.ok(hero.includes('useDemoCharts'))
  assert.ok(hero.includes('equityCurve'))
  assert.equal(hero.includes('M0 168'), false)
})

test('sample withdrawal cards stay in $35–$10,000 and are not labeled verified', () => {
  const landing = read(path.join(repoRoot, 'apps/web/src/mocks/landing.ts'))
  const strip = read(path.join(repoRoot, 'apps/web/src/components/marketing/distributions-strip.tsx'))
  const amounts = [...landing.matchAll(/amount: '([0-9.]+)'/g)].map((m) => Number(m[1]))
  const distBlock = landing.slice(landing.indexOf('RECENT_DISTRIBUTIONS'))
  const distAmounts = [...distBlock.matchAll(/amount: '([0-9.]+)'/g)].map((m) => Number(m[1]))
  assert.ok(distAmounts.length >= 6)
  for (const n of distAmounts) {
    assert.ok(n >= 35 && n <= 10000, `sample amount ${n} outside presentation range`)
  }
  assert.equal(strip.includes('verified profits paid'), false)
  assert.equal(strip.includes('12500'), false)
  assert.ok(strip.includes('Sample'))
  assert.ok(strip.includes('not verified live investor withdrawals'))
  assert.ok(amounts.includes(9500))
})

test('authorized testimonials keep country metadata and do not invent a 70/30 mix', () => {
  const landing = read(path.join(repoRoot, 'apps/web/src/mocks/landing.ts'))
  const ui = read(path.join(repoRoot, 'apps/web/src/components/marketing/testimonials.tsx'))
  const countries = [...landing.matchAll(/country: '([^']+)'/g)].map((m) => m[1])
  const india = countries.filter((c) => c === 'India').length
  assert.ok(countries.length >= 10)
  assert.equal(india, 1)
  assert.ok(india / countries.length < 0.5, 'do not invent extra India testimonials')
  assert.ok(ui.includes('Sample quote'))
  assert.equal(ui.includes('Verified investor'), false)
  assert.ok(ui.includes('Marketing sample quotes'))
})

test('yearly cards and trust strip do not use demo/backtest or fabricated payout labels', () => {
  const liveStats = read(path.join(repoRoot, 'apps/web/src/features/landing/live-stats.ts'))
  const showcase = read(path.join(repoRoot, 'apps/web/src/components/marketing/performance-showcase.tsx'))
  const trust = read(path.join(repoRoot, 'apps/web/src/components/marketing/trust-strip.tsx'))
  assert.equal(liveStats.includes('Demo / backtest programme return'), false)
  assert.equal(showcase.includes('Demo / backtest'), false)
  assert.equal(trust.includes('Verified investors'), false)
  assert.equal(trust.includes('18.9'), false)
  assert.ok(trust.includes('useLandingLiveStats'))
  assert.ok(trust.includes('Published trades'))
})
