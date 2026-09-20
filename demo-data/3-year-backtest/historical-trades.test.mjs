#!/usr/bin/env node
/**
 * Validate the one-time historical trade archive against the frozen Profit
 * dataset. Does not touch any database and does not call market APIs.
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
const apiCopy = path.join(repoRoot, 'apps/api/data/demo/trades.json')
const exportJson = path.join(__dirname, 'export/json')
const MICRO = 1_000_000n
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function toMicro(n) {
  return BigInt(Math.round(Number(n) * Number(MICRO)))
}

function inRange(bar, price, eps) {
  return price + eps >= bar.low && price - eps <= bar.high
}

test('historical trades exist beside frozen profit JSON', () => {
  for (const name of ['trades.json', 'daily_returns.json', 'historical-trades-validation.json']) {
    assert.ok(fs.existsSync(path.join(publicDir, name)), name)
  }
  assert.ok(fs.existsSync(apiCopy), 'API canonical trades copy')
  assert.ok(fs.existsSync(path.join(exportJson, 'trades.json')))
})

test('dataset version, period, and import summary', () => {
  const report = readJson(path.join(publicDir, 'historical-trades-validation.json'))
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  assert.equal(report.datasetVersion, 'wealthora-historical-trades-v1')
  assert.equal(report.profitSeed, 'wealthora-4y-public-demo-v1')
  assert.equal(report.dateRange.start, '2022-09-01')
  assert.equal(report.dateRange.end, '2026-08-05')
  assert.equal(report.totalTradingDays, daily.length)
  assert.equal(report.totalTrades, trades.length)
  assert.equal(report.dailyReconciliationFailures, 0)
  assert.equal(report.ok, true)
  assert.equal(daily[0].date, '2022-09-01')
  assert.equal(daily[daily.length - 1].date, '2026-08-05')
  assert.ok(trades.every((t) => t.datasetVersion === 'wealthora-historical-trades-v1'))
})

test('1–4 trades per day with a varied distribution', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const byDate = new Map()
  for (const t of trades) {
    byDate.set(t.tradeDate, (byDate.get(t.tradeDate) ?? 0) + 1)
  }
  assert.equal(byDate.size, daily.length)
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const day of daily) {
    const n = byDate.get(day.date)
    assert.ok(n >= 1 && n <= 4, `${day.date} has ${n} trades`)
    dist[n] += 1
  }
  assert.ok(dist[1] > 0 && dist[2] > 0 && dist[3] > 0 && dist[4] > 0)
  assert.ok(new Set(Object.values(dist)).size >= 3, 'counts should not be uniform')
})

test('multiple FX pairs and both BUY and SELL', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const pairs = new Set(trades.map((t) => t.pair))
  assert.ok(pairs.size >= 8, `pair count ${pairs.size}`)
  for (const required of ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'EUR/GBP']) {
    assert.ok(pairs.has(required), required)
  }
  assert.equal(
    trades.every((t) => t.direction === 'BUY' || t.direction === 'SELL'),
    true,
  )
  const buys = trades.filter((t) => t.direction === 'BUY').length
  const sells = trades.filter((t) => t.direction === 'SELL').length
  assert.ok(buys > 200 && sells > 200)
})

test('winning and losing trades near an 80/20 target', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const wins = trades.filter((t) => t.outcome === 'WIN' || t.returnPct > 0)
  const losses = trades.filter((t) => t.outcome === 'LOSS' || t.returnPct < 0)
  assert.ok(wins.length > 0 && losses.length > 0)
  const winPct = (wins.length / trades.length) * 100
  assert.ok(winPct >= 70 && winPct <= 90, `winPct ${winPct}`)
})

test('every trade has required fields, RFC UUID, and historical validation metadata', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const keys = new Set()
  for (const t of trades) {
    assert.ok(UUID_RE.test(t.id), t.id)
    assert.match(t.reference, /^TRD-H\d{6}$/)
    assert.match(t.tradeDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(t.pair && t.direction)
    assert.equal(typeof t.entryPrice, 'number')
    assert.equal(typeof t.exitPrice, 'number')
    assert.equal(typeof t.returnPct, 'number')
    assert.equal(t.status, 'CLOSED')
    assert.ok(t.marketValidation?.provider)
    assert.ok(t.marketValidation?.ohlc)
    assert.ok(String(t.disclosure || '').toLowerCase().includes('backtest'))
    assert.equal(t.disclosure.toLowerCase().includes('live executed fill'), true)
    assert.ok(!keys.has(t.idempotencyKey), t.idempotencyKey)
    keys.add(t.idempotencyKey)
  }
})

test('entry/exit prices sit inside validated OHLC and match BUY/SELL direction', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  for (const t of trades) {
    const bar = t.marketValidation.ohlc
    const pip = t.pair.endsWith('/JPY') ? 0.01 : t.pair.startsWith('XAU') ? 0.1 : 0.0001
    assert.ok(inRange(bar, t.entryPrice, pip / 2), `${t.reference} entry`)
    assert.ok(inRange(bar, t.exitPrice, pip / 2), `${t.reference} exit`)
    if (t.direction === 'BUY' && t.outcome === 'WIN') assert.ok(t.exitPrice > t.entryPrice, t.reference)
    if (t.direction === 'BUY' && t.outcome === 'LOSS') assert.ok(t.exitPrice < t.entryPrice, t.reference)
    if (t.direction === 'SELL' && t.outcome === 'WIN') assert.ok(t.exitPrice < t.entryPrice, t.reference)
    if (t.direction === 'SELL' && t.outcome === 'LOSS') assert.ok(t.exitPrice > t.entryPrice, t.reference)
  }
})

test('daily trade P/L reconciles to frozen profit using decimal-safe micros', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const byDate = new Map()
  for (const t of trades) {
    byDate.set(t.tradeDate, (byDate.get(t.tradeDate) ?? 0n) + toMicro(t.returnPct))
  }
  let failures = 0
  for (const day of daily) {
    const sum = byDate.get(day.date)
    if (sum !== toMicro(day.netReturnPct)) failures += 1
  }
  assert.equal(failures, 0)
})

test('frozen profit percentages are unchanged from git HEAD when available', () => {
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))
  assert.equal(stats.totalReturnPct, 734.4)
  assert.equal(stats.endingEquity, 834.4)
  assert.equal(stats.winRatePct, 87.22)
  assert.equal(stats.avgMonthlyReturnPct, 15.3)
  assert.equal(stats.bestDay.date, '2026-08-04')
  assert.equal(stats.bestDay.returnPct, 7.557741)
  const day = daily.find((d) => d.date === '2026-08-04')
  assert.equal(day.netReturnPct, 7.557741)
  assert.equal(day.computedReturnPct, 7.557741)
})

test('no duplicate trades by idempotency key or reference', () => {
  const trades = readJson(path.join(publicDir, 'trades.json'))
  assert.equal(new Set(trades.map((t) => t.reference)).size, trades.length)
  assert.equal(new Set(trades.map((t) => t.id)).size, trades.length)
  assert.equal(new Set(trades.map((t) => t.idempotencyKey)).size, trades.length)
})

test('API copy matches public canonical trades', () => {
  const pub = fs.readFileSync(path.join(publicDir, 'trades.json'))
  const api = fs.readFileSync(apiCopy)
  assert.equal(createHash('sha256').update(pub).digest('hex'), createHash('sha256').update(api).digest('hex'))
})

test('Excel profit file is left as profit-only; trade blotter is trades.csv', () => {
  assert.ok(fs.existsSync(path.join(publicDir, 'daily_returns.xlsx')))
  assert.ok(fs.existsSync(path.join(publicDir, 'trades.csv')))
  const csv = fs.readFileSync(path.join(publicDir, 'trades.csv'), 'utf8')
  assert.match(csv, /datasetVersion/)
  assert.match(csv, /TRD-H000001/)
  const trades = readJson(path.join(publicDir, 'trades.json'))
  assert.equal(csv.trim().split(/\r?\n/).length - 1, trades.length)
})
