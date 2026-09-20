#!/usr/bin/env node
/**
 * Validate the committed 4-year public demo dataset and that website/report
 * artifacts agree with it. Does not touch any database.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const publicDir = path.join(repoRoot, 'apps/web/public/demo/backtest')
const exportJson = path.join(__dirname, 'export/json')
const exportCsv = path.join(__dirname, 'export/csv')

const MONTHLY_MIN = 13
const MONTHLY_MAX = 17
const YEARLY_AVG = 15.3
const AVG_TOL = 0.05
const TARGET_MONTHS = 48

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function weekdayCount(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  let n = 0
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) n += 1
  }
  return n
}

test('canonical public demo JSON exists', () => {
  for (const name of [
    'dashboard_stats.json',
    'monthly_returns.json',
    'daily_returns.json',
    'charts.json',
    'validation.json',
  ]) {
    assert.ok(fs.existsSync(path.join(publicDir, name)), name)
    assert.ok(fs.existsSync(path.join(exportJson, name)), `export ${name}`)
  }
})

test('48 months, 13–17%, yearly average ≈ 15.30, no duplicate months', () => {
  const monthly = readJson(path.join(publicDir, 'monthly_returns.json'))
  const validation = readJson(path.join(publicDir, 'validation.json'))
  assert.equal(monthly.length, TARGET_MONTHS)

  const keys = monthly.map((m) => m.yearMonth)
  assert.equal(new Set(keys).size, keys.length)
  assert.deepEqual(keys, [...keys].sort())

  for (const m of monthly) {
    assert.ok(m.returnPct >= MONTHLY_MIN, `${m.yearMonth} ${m.returnPct} < 13`)
    assert.ok(m.returnPct <= MONTHLY_MAX, `${m.yearMonth} ${m.returnPct} > 17`)
  }

  const unique = new Set(monthly.map((m) => Number(m.returnPct).toFixed(2)))
  assert.ok(unique.size >= 36, `too little monthly variation (${unique.size})`)
  assert.ok(!monthly.every((m) => m.returnPct === 15.3), 'must not be flat 15.3%')

  const overall = monthly.reduce((a, m) => a + m.returnPct, 0) / monthly.length
  assert.ok(Math.abs(overall - YEARLY_AVG) <= AVG_TOL, `overall avg ${overall}`)

  assert.equal(validation.programmeYears.length, 4)
  for (const year of validation.programmeYears) {
    assert.equal(year.months, 12)
    assert.ok(Math.abs(year.avgMonthlyReturnPct - YEARLY_AVG) <= AVG_TOL, `year ${year.index}`)
  }
})

test('trading days are derived from weekday records', () => {
  const charts = readJson(path.join(publicDir, 'charts.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))
  const expected = weekdayCount(charts.meta.startDate, charts.meta.endDate)
  assert.equal(daily.length, expected)
  assert.equal(stats.tradingDayCount, expected)
  assert.equal(stats.tradingDayCount, daily.length)
})

test('Growth of $100 uses simple accumulation and CAGR is absent', () => {
  const monthly = readJson(path.join(publicDir, 'monthly_returns.json'))
  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))
  const charts = readJson(path.join(publicDir, 'charts.json'))
  const meta = readJson(path.join(exportJson, 'meta.json'))

  let value = 100
  for (const m of monthly) {
    value = value + 100 * (m.returnPct / 100)
    assert.ok(Math.abs(Number(value.toFixed(4)) - m.growthOf100) < 0.001, m.yearMonth)
  }
  assert.ok(Math.abs(value - stats.endingEquity) < 0.05)
  const total = monthly.reduce((a, m) => a + m.returnPct, 0)
  assert.ok(Math.abs(total - stats.totalReturnPct) < 0.05)
  assert.ok(Math.abs(100 + total - stats.endingEquity) < 0.05)

  assert.equal(stats.cagrPct, undefined)
  assert.equal(charts.meta.cagrPct, undefined)
  assert.equal(meta.cagrPct, undefined)
  assert.equal(stats.returnModel, 'simple')
  assert.equal(meta.returnModel, 'simple')
  assert.ok(stats.endingEquity < 5000, 'ending equity must not be compounded')
  assert.ok(Math.abs(stats.simpleAnnualizedReturnPct - 15.3 * 12) <= 0.6)
})

test('daily simple returns sum to each monthly target and do not compound', () => {
  const monthly = readJson(path.join(publicDir, 'monthly_returns.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const charts = readJson(path.join(publicDir, 'charts.json'))

  const byYm = new Map()
  for (const d of daily) {
    const ym = d.date.slice(0, 7)
    byYm.set(ym, (byYm.get(ym) ?? 0) + d.netReturnPct)
  }
  for (const m of monthly) {
    const sum = byYm.get(m.yearMonth) ?? 0
    assert.ok(Math.abs(sum - m.returnPct) < 0.02, `${m.yearMonth} daily sum ${sum} vs ${m.returnPct}`)
  }

  let cum = 0
  for (const point of charts.equityCurve.slice(1)) {
    cum += point.returnPct
    const expected = 100 + cum
    assert.ok(
      Math.abs(expected - point.equity) < 0.05,
      `daily compounding at ${point.date}: ${point.equity} vs simple ${expected}`,
    )
  }
})

test('win rate is derived from daily simple returns', () => {
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))
  const wins = daily.filter((d) => d.netReturnPct > 0).length
  const expected = Math.round((wins / daily.length) * 10000) / 100
  assert.ok(Math.abs(expected - stats.winRatePct) < 0.02)
})

test('best/worst month and day are derived from the dataset', () => {
  const monthly = readJson(path.join(publicDir, 'monthly_returns.json'))
  const daily = readJson(path.join(publicDir, 'daily_returns.json'))
  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))

  const bestM = monthly.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
  const worstM = monthly.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
  assert.equal(stats.bestMonth.yearMonth, bestM.yearMonth)
  assert.equal(stats.worstMonth.yearMonth, worstM.yearMonth)

  const bestD = daily.reduce((a, b) => (b.netReturnPct > a.netReturnPct ? b : a))
  const worstD = daily.reduce((a, b) => (b.netReturnPct < a.netReturnPct ? b : a))
  assert.equal(stats.bestDay.date, bestD.date)
  assert.equal(stats.worstDay.date, worstD.date)
})

test('seeded dataset is reproducible (same monthly series as export)', () => {
  const pub = readJson(path.join(publicDir, 'monthly_returns.json'))
  const exp = readJson(path.join(exportJson, 'monthly_returns.json'))
  assert.deepEqual(
    pub.map((m) => [m.yearMonth, m.returnPct]),
    exp.map((m) => [m.yearMonth, m.returnPct]),
  )
  const meta = readJson(path.join(exportJson, 'meta.json'))
  assert.equal(meta.seed, 'wealthora-4y-public-demo-v1')
})

test('CSV export matches canonical monthly returns', () => {
  const monthly = readJson(path.join(publicDir, 'monthly_returns.json'))
  const csv = fs.readFileSync(path.join(exportCsv, 'monthly_returns.csv'), 'utf8').trim().split(/\r?\n/)
  assert.ok(csv[0].includes('yearMonth'))
  assert.equal(csv.length - 1, monthly.length)
  for (let i = 0; i < monthly.length; i++) {
    assert.ok(csv[i + 1].startsWith(monthly[i].yearMonth), csv[i + 1])
    assert.ok(csv[i + 1].includes(String(monthly[i].returnPct)))
  }
  const publicCsv = fs.readFileSync(path.join(publicDir, 'monthly_returns.csv'), 'utf8')
  const exportMonthlyCsv = fs.readFileSync(path.join(exportCsv, 'monthly_returns.csv'), 'utf8')
  assert.equal(publicCsv, exportMonthlyCsv)
  assert.ok(fs.existsSync(path.join(publicDir, 'trades.csv')))
})

test('HTML reports, CSV, and catalog use the same simple-return headline stats', () => {
  const stats = readJson(path.join(publicDir, 'dashboard_stats.json'))
  const html = fs.readFileSync(path.join(publicDir, 'reports/backtest-summary.html'), 'utf8')
  assert.ok(html.includes(String(stats.tradingDayCount)))
  assert.ok(html.includes(String(stats.avgMonthlyReturnPct)))
  assert.ok(html.includes(String(stats.simpleAnnualizedReturnPct)))
  assert.ok(html.includes('Annualized simple return'))
  assert.equal(html.includes('CAGR'), false)
  assert.ok(!html.includes('469.78'))
  const catalog = readJson(path.join(publicDir, 'report_catalog.json'))
  assert.ok(catalog.reports.length >= 2)
  const catalogText = JSON.stringify(catalog)
  assert.equal(catalogText.includes('CAGR'), false)
})

test('website charts and live-stats use simple-return calculations', () => {
  const liveStats = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/features/landing/live-stats.ts'),
    'utf8',
  )
  const hpcCharts = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/components/marketing/hpc-charts.tsx'),
    'utf8',
  )
  const monthlyChart = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/components/marketing/monthly-performance-chart.tsx'),
    'utf8',
  )
  assert.ok(liveStats.includes('principal * (m.returnPct / 100)'))
  assert.equal(liveStats.includes('cagrFromValues'), false)
  assert.equal(hpcCharts.includes('CAGR'), false)
  assert.equal(monthlyChart.includes('CAGR'), false)
  assert.ok(hpcCharts.includes('simpleAnnualized') || hpcCharts.includes('Annualized simple return'))
})

test('homepage hero chart binds to the canonical daily equityCurve', () => {
  const hero = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/components/marketing/hero-visual.tsx'),
    'utf8',
  )
  const mapper = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/features/landing/public-equity-chart.ts'),
    'utf8',
  )
  assert.ok(hero.includes('useDemoCharts'))
  assert.ok(hero.includes('equityCurve'))
  assert.ok(hero.includes('mapCanonicalEquityCurve'))
  assert.ok(hero.includes('AreaChart'))
  assert.ok(hero.includes('Tooltip'))
  assert.equal(hero.includes('M0 168'), false)
  assert.equal(hero.includes('role="presentation"'), false)
  assert.equal(/not a return figure/i.test(hero), false)
  assert.ok(mapper.includes('charts.json equityCurve'))
})

test('canonical equityCurve covers the public archive used by the homepage chart', () => {
  const charts = readJson(path.join(publicDir, 'charts.json'))
  const curve = charts.equityCurve
  assert.ok(Array.isArray(curve))
  assert.ok(curve.length >= 1025, `expected full daily series, got ${curve.length}`)
  assert.equal(curve[0].equity, 100)
  assert.equal(curve[curve.length - 1].date, '2026-08-05')
  assert.equal(curve[curve.length - 1].equity, 834.4)
  const tradingDays = curve.filter((p) => p.date >= '2022-09-01' && p.date <= '2026-08-05')
  assert.equal(tradingDays.length, charts.meta.tradingDayCount)
  assert.equal(charts.meta.startDate, '2022-09-01')
  assert.equal(charts.meta.endDate, '2026-08-05')
  assert.equal(charts.meta.endingEquity, 834.4)
  assert.equal(charts.meta.totalReturnPct, 734.4)
  assert.equal(charts.meta.returnModel, 'simple')
})

test('public marketing components do not compound demo balances', () => {
  const files = [
    'apps/web/src/features/landing/live-stats.ts',
    'apps/web/src/components/marketing/hpc-charts.tsx',
    'apps/web/src/components/marketing/monthly-performance-chart.tsx',
    'apps/web/src/components/marketing/historical-return-timeline.tsx',
    'apps/web/src/components/marketing/investment-calculator.tsx',
    'apps/web/src/components/marketing/hero-visual.tsx',
    'apps/web/src/features/landing/public-equity-chart.ts',
  ]
  for (const rel of files) {
    const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8')
    assert.equal(src.includes('cagrFromValues'), false, rel)
    assert.equal(src.includes('CAGR'), false, rel)
    assert.equal(src.includes('Math.pow'), false, rel)
    assert.equal(src.includes('* (1 +'), false, rel)
    assert.equal(src.includes('× (1 +'), false, rel)
  }
})

test('public website prefers canonical demo over publicMeta', () => {
  const liveStats = fs.readFileSync(
    path.join(repoRoot, 'apps/web/src/features/landing/live-stats.ts'),
    'utf8',
  )
  const hooks = fs.readFileSync(path.join(repoRoot, 'apps/web/src/features/landing/hooks.ts'), 'utf8')
  const hpc = fs.readFileSync(path.join(repoRoot, 'apps/web/src/features/hpc/use-hpc-data.ts'), 'utf8')
  assert.ok(liveStats.includes('demoHistoryUsable'))
  assert.ok(
    fs
      .readFileSync(path.join(repoRoot, 'apps/web/src/components/marketing/live-trades-preview.tsx'), 'utf8')
      .includes('demoHistoryUsable'),
    'homepage trade cards must prefer the canonical demo blotter',
  )
  assert.ok(liveStats.includes('if (demo.length >= 12) return demo'))
  assert.ok(hpc.includes('demoFull'))
  assert.ok(hooks.includes('buildLandingLiveStats'))
})
