#!/usr/bin/env node
/**
 * Homepage performance chart must bind to the canonical daily equity series.
 * Does not regenerate dataset files.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const publicDir = path.join(repoRoot, 'apps/web/public/demo/backtest')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function utcTs(iso) {
  return Date.parse(`${String(iso).slice(0, 10)}T00:00:00.000Z`)
}

function mapCanonicalEquityCurve(curve) {
  if (!Array.isArray(curve) || curve.length === 0) return []
  const out = []
  for (const row of curve) {
    const date = String(row?.date ?? '').slice(0, 10)
    const ts = utcTs(date)
    const equity = Number(row?.equity)
    const returnPct = Number(row?.returnPct)
    if (!date || !Number.isFinite(ts) || !Number.isFinite(equity)) continue
    out.push({
      ts,
      date,
      equity,
      returnPct: Number.isFinite(returnPct) ? returnPct : 0,
    })
  }
  return out
}

test('canonical daily equity series is complete and simple-return', () => {
  const charts = readJson(path.join(publicDir, 'charts.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const curve = charts.equityCurve
  assert.equal(daily.length, 1025)
  assert.equal(charts.meta.tradingDayCount, 1025)
  assert.equal(curve.length, daily.length + 1)
  assert.equal(curve[0].date, '2022-08-31')
  assert.equal(curve[0].equity, 100)
  assert.equal(curve[1].date, '2022-09-01')
  assert.equal(curve.at(-1).date, '2026-08-05')
  assert.equal(curve.at(-1).equity, 834.4)
  const byDate = new Map(curve.map((p) => [p.date, p]))
  for (const day of daily) {
    const pt = byDate.get(day.date)
    assert.ok(pt, `missing equity point ${day.date}`)
    assert.equal(pt.returnPct, day.netReturnPct)
  }
})

test('homepage chart mapper keeps every canonical equity point', () => {
  const charts = readJson(path.join(publicDir, 'charts.json'))
  const mapped = mapCanonicalEquityCurve(charts.equityCurve)
  assert.equal(mapped.length, charts.equityCurve.length)
  assert.equal(mapped.length, 1026)
  assert.equal(mapped[0].date, '2022-08-31')
  assert.equal(mapped[0].equity, 100)
  assert.equal(mapped.at(-1).date, '2026-08-05')
  assert.equal(mapped.at(-1).equity, 834.4)
  const years = new Set(mapped.map((p) => new Date(p.ts).getUTCFullYear()))
  assert.deepEqual([...years], [2022, 2023, 2024, 2025, 2026])
})

test('hero chart source uses Recharts + canonical loader, not a placeholder path', () => {
  const hero = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/components/marketing/hero-visual.tsx'),
    'utf8',
  )
  assert.ok(hero.includes("from 'recharts'"))
  assert.ok(hero.includes('useDemoCharts'))
  assert.ok(hero.includes('mapCanonicalEquityCurve'))
  assert.ok(hero.includes('charts?.equityCurve'))
  assert.equal(hero.includes('L46 152'), false)
  assert.equal(hero.includes('M0 168'), false)
  assert.equal(hero.includes('hardcoded'), false)
  assert.equal(hero.includes('role="presentation"'), false)
  assert.equal(/\[\s*\{\s*date:/.test(hero), false)
})
