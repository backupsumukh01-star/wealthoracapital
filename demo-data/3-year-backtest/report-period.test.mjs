#!/usr/bin/env node
/**
 * Period-filtered HPC reports must be calculated from the selected slice of
 * the canonical public demo ledger. Does not regenerate dataset files and
 * does not touch any database.
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
const reportsDir = path.join(publicDir, 'reports')

const PRINCIPAL = 100
const DATASET_HASHES = {
  'daily_returns.json': 'c3b595d781ced027b4bdffbbfba2c6da04ecc213657b07be2fcda0be41d41787',
  'dashboard_stats.json': '6636088c3811bff854f9395a3372dc17bd8fd8d537d12a360377b3a6b59c8875',
  'monthly_returns.json': 'ef7b92480eb419e9fb5e36fa6e18b66a914d57226b661772af05b4c8efd76605',
  'trades.json': '3810f08934bdac96fa28975e58346885eb7edfbd0af708001c5e82cfbad828df',
  'charts.json': '06343b433227759e95e031b2446ea77e59bcd8907222104c407cd1ce2e51df50',
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function attr(html, name) {
  const m = html.match(new RegExp(`data-${name}="([^"]*)"`))
  assert.ok(m, `missing data-${name}`)
  return m[1]
}

function kpiGridRegion(html) {
  const gridStart = html.indexOf('data-kpi-grid=')
  assert.ok(gridStart >= 0, 'missing KPI grid')
  const refStart = html.indexOf('data-archive-reference')
  const growthStart = html.indexOf('Growth of $100')
  const end = refStart >= 0 ? refStart : growthStart
  assert.ok(end > gridStart, 'could not bound KPI grid')
  return html.slice(gridStart, end)
}

function kpiValue(html, kpi) {
  const region = kpiGridRegion(html)
  const card = region.match(new RegExp(`data-kpi="${kpi}"[\\s\\S]*?<strong[^>]*>([\\s\\S]*?)</strong>`))
  assert.ok(card, `missing KPI card ${kpi}`)
  return card[1].replace(/<[^>]+>/g, '').trim()
}

function mondaySundayWeek(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  const dow = d.getUTCDay()
  const off = dow === 0 ? 6 : dow - 1
  const start = new Date(d)
  start.setUTCDate(d.getUTCDate() - off)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  const iso2 = (x) => x.toISOString().slice(0, 10)
  return { start: iso2(start), end: iso2(end) }
}

function expectedSlice(daily, trades, start, end) {
  const days = daily.filter((d) => d.date >= start && d.date <= end)
  const sliceTrades = trades.filter((t) => t.tradeDate >= start && t.tradeDate <= end)
  const simpleReturn = days.reduce((s, d) => s + Number(d.netReturnPct), 0)
  const profit = PRINCIPAL * (simpleReturn / 100)
  const ending = PRINCIPAL + profit
  const wins = sliceTrades.filter((t) => t.outcome === 'WIN' || t.returnPct > 0)
  const losses = sliceTrades.filter((t) => t.outcome === 'LOSS' || t.returnPct < 0)
  const winRate = sliceTrades.length ? (wins.length / sliceTrades.length) * 100 : 0
  const bestDay = days.reduce((a, b) => (Number(b.netReturnPct) > Number(a.netReturnPct) ? b : a))
  const worstDay = days.reduce((a, b) => (Number(b.netReturnPct) < Number(a.netReturnPct) ? b : a))
  return {
    start,
    end,
    tradingDays: days.length,
    tradeCount: sliceTrades.length,
    simpleReturn,
    profit,
    ending,
    wins: wins.length,
    losses: losses.length,
    winRate,
    bestDay,
    worstDay,
    days,
  }
}

function assertPeriodReport(html, expected, { archive = false } = {}) {
  const start = attr(html, 'period-start')
  const end = attr(html, 'period-end')
  assert.equal(start, expected.start)
  assert.equal(end, expected.end)
  assert.equal(Number(attr(html, 'trading-days')), expected.tradingDays)
  assert.equal(Number(attr(html, 'trade-count')), expected.tradeCount)
  assert.equal(Number(attr(html, 'simple-return')), Number(expected.simpleReturn.toFixed(2)))
  assert.equal(Number(attr(html, 'profit')), Number(expected.profit.toFixed(2)))
  assert.equal(Number(attr(html, 'ending')), Number(expected.ending.toFixed(2)))
  assert.equal(Number(attr(html, 'win-count')), expected.wins)
  assert.equal(Number(attr(html, 'loss-count')), expected.losses)
  assert.equal(Number(attr(html, 'win-rate')), Number(expected.winRate.toFixed(2)))

  assert.equal(kpiValue(html, 'trading-days'), String(expected.tradingDays))
  assert.equal(kpiValue(html, 'trade-count'), String(expected.tradeCount))
  if (!archive) {
    assert.equal(kpiValue(html, 'period-return'), `${expected.simpleReturn.toFixed(2)}%`)
    assert.equal(kpiValue(html, 'ending'), `$${expected.ending.toFixed(2)}`)
    assert.equal(kpiValue(html, 'win-count'), String(expected.wins))
    assert.equal(kpiValue(html, 'loss-count'), String(expected.losses))
    assert.match(html, /Full Archive Reference/)
    const grid = kpiGridRegion(html)
    assert.equal(grid.includes('1,025'), false)
    assert.equal(grid.includes('>1025<'), false)
    assert.equal(grid.includes('2,567'), false)
    assert.equal(grid.includes('>2567<'), false)
    assert.equal(grid.includes('3,545'), false)
    assert.equal(grid.includes('>3545<'), false)
    assert.equal(grid.includes('734.40'), false)
    assert.equal(grid.includes('734.4%'), false)
    assert.equal(grid.includes('834.40'), false)
    assert.equal(grid.includes('183.60'), false)
    assert.equal(grid.includes('Aug 2025'), false)
    assert.equal(grid.includes('Apr 2024'), false)
  } else {
    assert.equal(kpiValue(html, 'trading-days'), '1025')
    assert.equal(kpiValue(html, 'trade-count'), '2567')
    assert.match(kpiValue(html, 'total-return'), /734\.4/)
    assert.match(kpiValue(html, 'ending'), /834\.4/)
    assert.match(html, /Annualized simple return/)
    assert.equal(html.includes('CAGR'), false)
  }

  const compounded = expected.days.reduce((eq, d) => eq * (1 + Number(d.netReturnPct) / 100), PRINCIPAL)
  if (expected.days.length > 1) {
    assert.notEqual(Number(expected.ending.toFixed(2)), Number(compounded.toFixed(2)))
  }
  assert.equal(Number(expected.profit.toFixed(6)), Number((PRINCIPAL * (expected.simpleReturn / 100)).toFixed(6)))
}

test('canonical dataset hashes are unchanged', () => {
  for (const [name, expected] of Object.entries(DATASET_HASHES)) {
    const actual = sha256(path.join(publicDir, name))
    assert.equal(actual, expected, `${name} hash changed`)
  }
})

test('period reports match independently filtered canonical daily data', () => {
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const trades = readJson(path.join(publicDir, 'trades.json'))
  const monthly = readJson(path.join(publicDir, 'monthly_returns.json'))
  const last = daily[daily.length - 1].date
  const week = mondaySundayWeek(last)
  const weekEnd = week.end < last ? week.end : last
  const latestMonth = monthly[monthly.length - 1]
  const q = Math.floor((latestMonth.month - 1) / 3) + 1
  const qStartMonth = (q - 1) * 3 + 1
  const qStart = `${latestMonth.year}-${String(qStartMonth).padStart(2, '0')}-01`
  const qEndDate = new Date(Date.UTC(latestMonth.year, qStartMonth + 2, 0)).toISOString().slice(0, 10)
  const qEnd = qEndDate < last ? qEndDate : last
  const yearStart = `${latestMonth.year}-01-01`

  const cases = [
    {
      file: 'daily-report.html',
      expected: expectedSlice(daily, trades, last, last),
    },
    {
      file: 'weekly-report.html',
      expected: expectedSlice(daily, trades, week.start, weekEnd),
    },
    {
      file: 'monthly-report.html',
      expected: expectedSlice(daily, trades, '2026-08-01', last),
    },
    {
      file: 'quarterly-report.html',
      expected: expectedSlice(daily, trades, qStart, qEnd),
    },
    {
      file: 'yearly-report.html',
      expected: expectedSlice(daily, trades, yearStart, last),
    },
    {
      file: 'backtest-summary.html',
      expected: expectedSlice(daily, trades, '2022-09-01', '2026-08-05'),
      archive: true,
    },
    {
      file: 'performance-summary.html',
      expected: expectedSlice(daily, trades, '2022-09-01', '2026-08-05'),
      archive: true,
    },
    {
      file: 'complete-3year-report.html',
      expected: expectedSlice(daily, trades, '2022-09-01', '2026-08-05'),
      archive: true,
    },
  ]

  for (const { file, expected, archive } of cases) {
    const html = fs.readFileSync(path.join(reportsDir, file), 'utf8')
    assertPeriodReport(html, expected, { archive: Boolean(archive) })
  }

  const monthlyHtml = fs.readFileSync(path.join(reportsDir, 'monthly-report.html'), 'utf8')
  assert.match(monthlyHtml, /Focus month Aug 2026: 15\.71% across 3 trading days/)
  assert.equal(kpiValue(monthlyHtml, 'trading-days'), '3')
  assert.equal(kpiValue(monthlyHtml, 'period-return'), '15.71%')

  const quarterlyHtml = fs.readFileSync(path.join(reportsDir, 'quarterly-report.html'), 'utf8')
  assert.match(quarterlyHtml, /29\.06%/)
  assert.equal(kpiValue(quarterlyHtml, 'trading-days'), '26')
  assert.equal(kpiValue(quarterlyHtml, 'period-return'), '29.06%')

  const yearlyHtml = fs.readFileSync(path.join(reportsDir, 'yearly-report.html'), 'utf8')
  assert.match(yearlyHtml, /121\.25%/)
  assert.equal(kpiValue(yearlyHtml, 'trading-days'), '155')
  assert.equal(kpiValue(yearlyHtml, 'period-return'), '121.25%')
})

test('report catalog seed matches the public demo seed', () => {
  const catalog = readJson(path.join(publicDir, 'report_catalog.json'))
  assert.equal(catalog.seed, 'wealthora-4y-public-demo-v1')
  assert.equal(JSON.stringify(catalog).includes('CAGR'), false)
})
