#!/usr/bin/env node
/**
 * Generate a reproducible 3-year demo/backtest dataset for UI presentation.
 *
 * Usage (repo root):
 *   node demo-data/3-year-backtest/generate.mjs
 *
 * Writes under: demo-data/3-year-backtest/export/{csv,json,sql,prisma,reports/html,reports/pdf}
 *
 * Demo only — see demo-data/DISCLAIMER.txt. Does not touch any database.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname)
const EXPORT_ROOT = path.join(ROOT, 'export')

const SEED = 'growzy-3y-backtest-v1'
const END_DATE = new Date(Date.UTC(2026, 7, 5)) // 2026-08-05
const START_DATE = new Date(Date.UTC(2023, 7, 7)) // ~3 years of weekdays
const STARTING_EQUITY = 100
const PAIRS = [
  { pair: 'EUR/USD', base: 1.085, digits: 5, pip: 0.0001 },
  { pair: 'GBP/USD', base: 1.27, digits: 5, pip: 0.0001 },
  { pair: 'USD/JPY', base: 149.5, digits: 3, pip: 0.01 },
  { pair: 'AUD/USD', base: 0.66, digits: 5, pip: 0.0001 },
  { pair: 'USD/CAD', base: 1.36, digits: 5, pip: 0.0001 },
  { pair: 'XAU/USD', base: 2350, digits: 2, pip: 0.1 },
  { pair: 'NZD/USD', base: 0.61, digits: 5, pip: 0.0001 },
  { pair: 'EUR/GBP', base: 0.855, digits: 5, pip: 0.0001 },
]
const STRATEGIES = ['AI Momentum', 'Mean Reversion', 'Session Breakout', 'Carry Overlay', 'Volatility Spike']

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function hashSeed(str) {
  const h = createHash('sha256').update(str).digest()
  return h.readUInt32BE(0)
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(hashSeed(SEED))

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function round(n, d = 6) {
  const f = 10 ** d
  return Math.round(n * f) / f
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function uuidFrom(parts) {
  const h = createHash('sha256').update(parts.join('|')).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

function refFrom(i) {
  return `TRD-${String(i).padStart(6, '0')}`
}

function isWeekday(d) {
  const day = d.getUTCDay()
  return day !== 0 && day !== 6
}

function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function addDays(d, n) {
  const x = new Date(d.getTime())
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

function* eachWeekday(start, end) {
  let d = new Date(start.getTime())
  while (d <= end) {
    if (isWeekday(d)) yield new Date(d.getTime())
    d = addDays(d, 1)
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function writeText(file, text) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, text, 'utf8')
}

function writeJson(file, data) {
  writeText(file, JSON.stringify(data, null, 2) + '\n')
}

function csvEscape(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows, columns) {
  const header = columns.join(',')
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c])).join(','))
    .join('\n')
  return header + '\n' + body + (body ? '\n' : '')
}

// ---------------------------------------------------------------------------
// Target monthly returns in [5, 10] — mostly mid-high 6–8
// ---------------------------------------------------------------------------

function targetMonthlyReturnPct(year, month /* 1-12 */) {
  // Deterministic seasonal-ish pattern in presentation band
  const base = 5.4 + ((year * 17 + month * 31) % 37) / 10 // 5.4 .. 9.0
  const wobble = (rand() - 0.5) * 1.2
  return round(clamp(base + wobble, 5.05, 9.85), 2)
}

function allocateDailyReturns(nDays, monthTargetPct) {
  // Convert monthly % to product of (1 + daily)
  const targetFactor = 1 + monthTargetPct / 100
  const raw = []
  for (let i = 0; i < nDays; i++) {
    // Mostly small positive, occasional small loss for realism
    const roll = rand()
    if (roll < 0.18) {
      raw.push(-(0.05 + rand() * 0.35)) // loss day −0.05% .. −0.40%
    } else if (roll < 0.28) {
      raw.push(0.02 + rand() * 0.08) // flat-ish
    } else {
      raw.push(0.15 + rand() * 0.55) // win day
    }
  }

  // Scale so product ≈ targetFactor (log space)
  let product = raw.reduce((p, r) => p * (1 + r / 100), 1)
  if (product <= 0) product = 1e-6
  const scale = Math.log(targetFactor) / Math.log(product)
  let scaled = raw.map((r) => {
    const f = (1 + r / 100) ** scale
    return (f - 1) * 100
  })

  // Fine-tune last day so product matches exactly
  let prod = 1
  for (let i = 0; i < scaled.length - 1; i++) prod *= 1 + scaled[i] / 100
  const lastFactor = targetFactor / prod
  scaled[scaled.length - 1] = (lastFactor - 1) * 100

  return scaled.map((x) => round(x, 6))
}

function buildTradesForDay(dayDate, dayReturnPct, tradeSeqStart) {
  const tradeCount = 2 + Math.floor(rand() * 4) // 2–5
  const weights = Array.from({ length: tradeCount }, () => 0.4 + rand())
  const wSum = weights.reduce((a, b) => a + b, 0)
  const trades = []
  let assigned = 0

  for (let i = 0; i < tradeCount; i++) {
    const isLast = i === tradeCount - 1
    let ret = isLast
      ? round(dayReturnPct - assigned, 6)
      : round((dayReturnPct * weights[i]) / wSum + (rand() - 0.5) * 0.08, 6)
    if (!isLast) assigned = round(assigned + ret, 6)

    const meta = pick(PAIRS)
    const direction = rand() > 0.48 ? 'BUY' : 'SELL'
    const outcome = ret >= 0 ? 'WIN' : 'LOSS'
    // Price move roughly consistent with return sign / direction
    const moveFrac = Math.abs(ret) / 100
    const entry = meta.base * (1 + (rand() - 0.5) * 0.04)
    let exit
    if (direction === 'BUY') {
      exit = outcome === 'WIN' ? entry * (1 + moveFrac) : entry * (1 - moveFrac)
    } else {
      exit = outcome === 'WIN' ? entry * (1 - moveFrac) : entry * (1 + moveFrac)
    }
    const pips = round(Math.abs(exit - entry) / meta.pip, 2)
    const openHour = 7 + Math.floor(rand() * 8)
    const durationMin = 25 + Math.floor(rand() * 280)
    const openTime = new Date(
      Date.UTC(
        dayDate.getUTCFullYear(),
        dayDate.getUTCMonth(),
        dayDate.getUTCDate(),
        openHour,
        Math.floor(rand() * 60),
        0,
      ),
    )
    const closeTime = new Date(openTime.getTime() + durationMin * 60_000)
    const seq = tradeSeqStart + i
    const id = uuidFrom(['trade', isoDate(dayDate), String(seq)])

    trades.push({
      id,
      reference: refFrom(seq),
      tradeDate: isoDate(dayDate),
      pair: meta.pair,
      direction,
      strategy: pick(STRATEGIES),
      risk: pick(['LOW', 'MEDIUM', 'HIGH']),
      lotSize: round(0.1 + rand() * 2.4, 2),
      entryPrice: round(entry, meta.digits),
      exitPrice: round(exit, meta.digits),
      stopLoss: round(entry * (direction === 'BUY' ? 0.998 : 1.002), meta.digits),
      takeProfit: round(entry * (direction === 'BUY' ? 1.004 : 0.996), meta.digits),
      openTime: openTime.toISOString(),
      closeTime: closeTime.toISOString(),
      status: 'SETTLED',
      outcome,
      returnPct: ret,
      pips,
      isPublic: true,
      profitAmount: ret >= 0 ? round(Math.abs(ret) * 120, 2) : null,
      lossAmount: ret < 0 ? round(Math.abs(ret) * 120, 2) : null,
    })
  }

  // Re-normalize trade returns so they sum exactly to dayReturnPct
  const sum = trades.reduce((a, t) => a + t.returnPct, 0)
  const drift = round(dayReturnPct - sum, 6)
  trades[trades.length - 1].returnPct = round(trades[trades.length - 1].returnPct + drift, 6)
  const last = trades[trades.length - 1]
  last.outcome = last.returnPct >= 0 ? 'WIN' : 'LOSS'

  return trades
}

// ---------------------------------------------------------------------------
// Build dataset
// ---------------------------------------------------------------------------

function buildDataset() {
  const weekdays = [...eachWeekday(START_DATE, END_DATE)]
  const byMonth = new Map()
  for (const d of weekdays) {
    const k = monthKey(d)
    if (!byMonth.has(k)) byMonth.set(k, [])
    byMonth.get(k).push(d)
  }

  const monthlyTargets = []
  const dailyReturnByDate = new Map()

  for (const [ym, days] of byMonth) {
    const [y, m] = ym.split('-').map(Number)
    const target = targetMonthlyReturnPct(y, m)
    monthlyTargets.push({ yearMonth: ym, year: y, month: m, targetPct: target, tradingDays: days.length })
    const daily = allocateDailyReturns(days.length, target)
    days.forEach((d, i) => dailyReturnByDate.set(isoDate(d), daily[i]))
  }

  const tradingDays = []
  const trades = []
  let tradeSeq = 1
  let equity = STARTING_EQUITY
  const equityCurve = [{ date: isoDate(addDays(START_DATE, -1)), equity: STARTING_EQUITY, returnPct: 0 }]

  for (const d of weekdays) {
    const date = isoDate(d)
    const netReturnPct = dailyReturnByDate.get(date)
    const dayTrades = buildTradesForDay(d, netReturnPct, tradeSeq)
    tradeSeq += dayTrades.length

    const winCount = dayTrades.filter((t) => t.outcome === 'WIN').length
    const lossCount = dayTrades.length - winCount
    const id = uuidFrom(['day', date])

    tradingDays.push({
      id,
      date,
      status: 'DISTRIBUTED',
      computedReturnPct: netReturnPct,
      netReturnPct,
      tradeCount: dayTrades.length,
      winCount,
      lossCount,
      summary:
        netReturnPct >= 0
          ? `Desk closed ${dayTrades.length} tickets; net +${netReturnPct.toFixed(2)}%.`
          : `Desk closed ${dayTrades.length} tickets; net ${netReturnPct.toFixed(2)}%.`,
      publishedAt: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 21, 0, 0)).toISOString(),
    })

    for (const t of dayTrades) {
      trades.push({ ...t, tradingDayId: id })
    }

    equity = round(equity * (1 + netReturnPct / 100), 6)
    equityCurve.push({ date, equity: round(equity, 4), returnPct: netReturnPct })
  }

  // Realized monthly returns from daily compounding
  const monthlyReturns = []
  for (const [ym, days] of byMonth) {
    let factor = 1
    for (const d of days) factor *= 1 + dailyReturnByDate.get(isoDate(d)) / 100
    const returnPct = round((factor - 1) * 100, 2)
    const year = Number(ym.slice(0, 4))
    const month = Number(ym.slice(5, 7))
    monthlyReturns.push({
      yearMonth: ym,
      year,
      month,
      label: new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      returnPct,
      tradingDays: days.length,
      inPresentationBand: returnPct >= 5 && returnPct <= 10,
    })
  }

  const yearlyMap = new Map()
  for (const m of monthlyReturns) {
    if (!yearlyMap.has(m.year)) yearlyMap.set(m.year, 1)
    yearlyMap.set(m.year, yearlyMap.get(m.year) * (1 + m.returnPct / 100))
  }
  const yearlyReturns = [...yearlyMap.entries()].map(([year, factor]) => ({
    year,
    returnPct: round((factor - 1) * 100, 2),
  }))

  const wins = trades.filter((t) => t.outcome === 'WIN').length
  const losses = trades.length - wins
  const positiveDays = tradingDays.filter((d) => d.netReturnPct >= 0).length
  const bestDay = tradingDays.reduce((a, b) => (b.netReturnPct > a.netReturnPct ? b : a))
  const worstDay = tradingDays.reduce((a, b) => (b.netReturnPct < a.netReturnPct ? b : a))
  const avgMonthly =
    monthlyReturns.length === 0
      ? 0
      : round(monthlyReturns.reduce((a, m) => a + m.returnPct, 0) / monthlyReturns.length, 2)

  const meta = {
    dataset: '3-year-backtest',
    version: 1,
    seed: SEED,
    generatedAt: new Date().toISOString(),
    startDate: isoDate(START_DATE),
    endDate: isoDate(END_DATE),
    tradingDayCount: tradingDays.length,
    tradeCount: trades.length,
    monthCount: monthlyReturns.length,
    startingEquity: STARTING_EQUITY,
    endingEquity: equityCurve[equityCurve.length - 1].equity,
    totalReturnPct: round((equityCurve[equityCurve.length - 1].equity / STARTING_EQUITY - 1) * 100, 2),
    disclaimer: 'Synthetic demo data for UI presentation only. Not live trading history.',
  }

  const dashboardStats = {
    tradingDayCount: tradingDays.length,
    tradeCount: trades.length,
    winCount: wins,
    lossCount: losses,
    winRatePct: round((wins / trades.length) * 100, 2),
    positiveDayPct: round((positiveDays / tradingDays.length) * 100, 2),
    avgMonthlyReturnPct: avgMonthly,
    monthsInBand: monthlyReturns.filter((m) => m.inPresentationBand).length,
    monthCount: monthlyReturns.length,
    bestDay: { date: bestDay.date, returnPct: bestDay.netReturnPct },
    worstDay: { date: worstDay.date, returnPct: worstDay.netReturnPct },
    totalReturnPct: meta.totalReturnPct,
    endingEquity: meta.endingEquity,
  }

  return {
    meta,
    dashboardStats,
    monthlyReturns,
    yearlyReturns,
    monthlyTargets,
    tradingDays,
    trades,
    equityCurve,
  }
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

function buildChartsPayload(data) {
  return {
    meta: {
      startDate: data.meta.startDate,
      endDate: data.meta.endDate,
      startingEquity: data.meta.startingEquity,
      endingEquity: data.meta.endingEquity,
      totalReturnPct: data.meta.totalReturnPct,
    },
    equityCurve: data.equityCurve,
    monthlyReturns: data.monthlyReturns.map((m) => ({
      yearMonth: m.yearMonth,
      label: m.label,
      returnPct: m.returnPct,
      tradingDays: m.tradingDays,
      inPresentationBand: m.inPresentationBand,
    })),
    yearlyReturns: data.yearlyReturns,
  }
}

function buildReportCatalog(data) {
  return {
    generatedAt: data.meta.generatedAt,
    seed: data.meta.seed,
    range: { startDate: data.meta.startDate, endDate: data.meta.endDate },
    disclaimer: data.meta.disclaimer,
    reports: [
      {
        id: 'backtest-summary-html',
        title: '3-Year Backtest Summary',
        description: 'HTML overview of monthly returns and headline stats.',
        format: 'html',
        href: '/demo/backtest/reports/backtest-summary.html',
        fileName: 'backtest-summary.html',
      },
      {
        id: 'backtest-summary-pdf',
        title: '3-Year Backtest Summary (PDF)',
        description: 'Single-page PDF snapshot of the synthetic track record.',
        format: 'pdf',
        href: '/demo/backtest/reports/backtest-summary.pdf',
        fileName: 'backtest-summary.pdf',
      },
    ],
  }
}

function writeJsonExports(data) {
  const dir = path.join(EXPORT_ROOT, 'json')
  writeJson(path.join(dir, 'meta.json'), data.meta)
  writeJson(path.join(dir, 'dashboard_stats.json'), data.dashboardStats)
  writeJson(path.join(dir, 'monthly_returns.json'), data.monthlyReturns)
  writeJson(path.join(dir, 'yearly_returns.json'), data.yearlyReturns)
  writeJson(path.join(dir, 'trading_days.json'), data.tradingDays)
  writeJson(path.join(dir, 'daily_returns.json'), data.tradingDays)
  writeJson(path.join(dir, 'trades.json'), data.trades)
  writeJson(path.join(dir, 'equity_curve.json'), data.equityCurve)
  writeJson(path.join(dir, 'charts.json'), buildChartsPayload(data))
  writeJson(path.join(dir, 'report_catalog.json'), buildReportCatalog(data))
}

/** Mirror the web-facing JSON (and report files) into Next.js public assets. */
function syncPublicDemoBacktest(data) {
  const repoRoot = path.resolve(ROOT, '../..')
  const publicDir = path.join(repoRoot, 'apps/web/public/demo/backtest')
  const reportsDir = path.join(publicDir, 'reports')

  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true })
  }
  ensureDir(publicDir)
  ensureDir(reportsDir)

  writeJson(path.join(publicDir, 'dashboard_stats.json'), data.dashboardStats)
  writeJson(path.join(publicDir, 'charts.json'), buildChartsPayload(data))
  writeJson(path.join(publicDir, 'daily_returns.json'), data.tradingDays)
  writeJson(path.join(publicDir, 'monthly_returns.json'), data.monthlyReturns)
  writeJson(path.join(publicDir, 'trades.json'), data.trades)
  writeJson(path.join(publicDir, 'report_catalog.json'), buildReportCatalog(data))

  const htmlSrc = path.join(EXPORT_ROOT, 'reports', 'html', 'backtest-summary.html')
  const pdfSrc = path.join(EXPORT_ROOT, 'reports', 'pdf', 'backtest-summary.pdf')
  if (fs.existsSync(htmlSrc)) fs.copyFileSync(htmlSrc, path.join(reportsDir, 'backtest-summary.html'))
  if (fs.existsSync(pdfSrc)) fs.copyFileSync(pdfSrc, path.join(reportsDir, 'backtest-summary.pdf'))

  console.log(`  Public sync:  ${publicDir}`)
}

function writeCsvExports(data) {
  const dir = path.join(EXPORT_ROOT, 'csv')
  writeText(
    path.join(dir, 'monthly_returns.csv'),
    toCsv(data.monthlyReturns, [
      'yearMonth',
      'year',
      'month',
      'label',
      'returnPct',
      'tradingDays',
      'inPresentationBand',
    ]),
  )
  writeText(
    path.join(dir, 'trading_days.csv'),
    toCsv(data.tradingDays, [
      'id',
      'date',
      'status',
      'computedReturnPct',
      'netReturnPct',
      'tradeCount',
      'winCount',
      'lossCount',
      'summary',
      'publishedAt',
    ]),
  )
  writeText(
    path.join(dir, 'trades.csv'),
    toCsv(data.trades, [
      'id',
      'reference',
      'tradingDayId',
      'tradeDate',
      'pair',
      'direction',
      'strategy',
      'risk',
      'lotSize',
      'entryPrice',
      'exitPrice',
      'returnPct',
      'pips',
      'outcome',
      'status',
      'openTime',
      'closeTime',
      'isPublic',
    ]),
  )
  writeText(
    path.join(dir, 'equity_curve.csv'),
    toCsv(data.equityCurve, ['date', 'equity', 'returnPct']),
  )
  writeText(
    path.join(dir, 'dashboard_stats.csv'),
    toCsv([data.dashboardStats], [
      'tradingDayCount',
      'tradeCount',
      'winCount',
      'lossCount',
      'winRatePct',
      'avgMonthlyReturnPct',
      'totalReturnPct',
      'endingEquity',
    ]),
  )
}

function sqlString(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return `'${String(v).replace(/'/g, "''")}'`
}

function writeSqlExports(data) {
  const dir = path.join(EXPORT_ROOT, 'sql')
  const lines = []
  lines.push('-- Synthetic demo dataset — DO NOT run against production.')
  lines.push('-- Generated by demo-data/3-year-backtest/generate.mjs')
  lines.push('BEGIN;')
  lines.push('')
  lines.push('-- daily_returns (trading days)')
  for (const d of data.tradingDays) {
    lines.push(
      `INSERT INTO daily_returns (id, date, status, computed_return_pct, net_return_pct, trade_count, win_count, loss_count, summary, created_at, updated_at) VALUES (${[
        sqlString(d.id),
        sqlString(d.date),
        sqlString(d.status),
        sqlString(d.computedReturnPct),
        sqlString(d.netReturnPct),
        sqlString(d.tradeCount),
        sqlString(d.winCount),
        sqlString(d.lossCount),
        sqlString(d.summary),
        sqlString(d.publishedAt),
        sqlString(d.publishedAt),
      ].join(', ')});`,
    )
  }
  lines.push('')
  lines.push('-- trades')
  for (const t of data.trades) {
    lines.push(
      `INSERT INTO trades (id, reference, pair, direction, strategy, risk, lot_size, entry_price, exit_price, open_time, close_time, trade_date, status, outcome, profit_amount, loss_amount, return_pct, pips, is_public, settled_at, created_at, updated_at) VALUES (${[
        sqlString(t.id),
        sqlString(t.reference),
        sqlString(t.pair),
        sqlString(t.direction),
        sqlString(t.strategy),
        sqlString(t.risk),
        sqlString(t.lotSize),
        sqlString(t.entryPrice),
        sqlString(t.exitPrice),
        sqlString(t.openTime),
        sqlString(t.closeTime),
        sqlString(t.tradeDate),
        sqlString(t.status),
        sqlString(t.outcome),
        sqlString(t.profitAmount),
        sqlString(t.lossAmount),
        sqlString(t.returnPct),
        sqlString(t.pips),
        sqlString(t.isPublic),
        sqlString(t.closeTime),
        sqlString(t.closeTime),
        sqlString(t.closeTime),
      ].join(', ')});`,
    )
  }
  lines.push('COMMIT;')
  writeText(path.join(dir, 'demo_backtest_inserts.sql'), lines.join('\n') + '\n')
}

function writePrismaExports(data) {
  const dir = path.join(EXPORT_ROOT, 'prisma')
  writeJson(path.join(dir, 'daily_returns.seed.json'), data.tradingDays)
  writeJson(
    path.join(dir, 'trades.seed.json'),
    data.trades.map(({ tradingDayId, ...rest }) => rest),
  )
  writeJson(path.join(dir, 'monthly_returns.seed.json'), data.monthlyReturns)
  writeText(
    path.join(dir, 'README.md'),
    [
      '# Prisma seed artefacts',
      '',
      'JSON shaped for offline review / optional demo seeding.',
      'Do **not** import into production without an explicit review.',
      '',
      `- daily_returns.seed.json — ${data.tradingDays.length} days`,
      `- trades.seed.json — ${data.trades.length} trades`,
      `- monthly_returns.seed.json — ${data.monthlyReturns.length} months`,
      '',
    ].join('\n'),
  )
}

function writeHtmlReport(data) {
  const dir = path.join(EXPORT_ROOT, 'reports', 'html')
  const monthsRows = data.monthlyReturns
    .map(
      (m) =>
        `<tr><td>${m.label}</td><td>${m.returnPct.toFixed(2)}%</td><td>${m.tradingDays}</td><td>${m.inPresentationBand ? 'yes' : 'no'}</td></tr>`,
    )
    .join('\n')
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>3-Year Demo Backtest — Meridian FX</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 2rem; color: #1a1a1a; background: #f7f5f1; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    .muted { color: #555; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin: 1.5rem 0; }
    .stat { background: #fff; border: 1px solid #ddd; padding: 0.75rem 1rem; }
    .stat b { display: block; font-size: 1.25rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #eee; }
    .warn { margin-top: 2rem; padding: 1rem; border-left: 4px solid #b45309; background: #fff7ed; }
  </style>
</head>
<body>
  <h1>3-Year Demo / Backtest Dataset</h1>
  <p class="muted">Synthetic presentation data · seed <code>${data.meta.seed}</code> · generated ${data.meta.generatedAt}</p>
  <div class="stats">
    <div class="stat"><span>Trading days</span><b>${data.meta.tradingDayCount}</b></div>
    <div class="stat"><span>Trades</span><b>${data.meta.tradeCount}</b></div>
    <div class="stat"><span>Avg monthly</span><b>${data.dashboardStats.avgMonthlyReturnPct}%</b></div>
    <div class="stat"><span>Total return</span><b>${data.meta.totalReturnPct}%</b></div>
    <div class="stat"><span>Ending equity</span><b>${data.meta.endingEquity}</b></div>
  </div>
  <h2>Monthly returns</h2>
  <table>
    <thead><tr><th>Month</th><th>Return</th><th>Days</th><th>5–10% band</th></tr></thead>
    <tbody>
${monthsRows}
    </tbody>
  </table>
  <div class="warn">
    <strong>Disclaimer:</strong> Fabricated demo data for UI presentation only.
    Not live trading history. Do not import into production databases.
  </div>
</body>
</html>
`
  writeText(path.join(dir, 'backtest-summary.html'), html)
}

/** Minimal single-page PDF without external deps. */
function writePdfReport(data) {
  const dir = path.join(EXPORT_ROOT, 'reports', 'pdf')
  const lines = [
    '3-Year Demo / Backtest Dataset',
    `Seed: ${data.meta.seed}`,
    `Range: ${data.meta.startDate} to ${data.meta.endDate}`,
    `Trading days: ${data.meta.tradingDayCount}`,
    `Trades: ${data.meta.tradeCount}`,
    `Avg monthly return: ${data.dashboardStats.avgMonthlyReturnPct}%`,
    `Months in 5-10% band: ${data.dashboardStats.monthsInBand}/${data.dashboardStats.monthCount}`,
    `Total return: ${data.meta.totalReturnPct}%`,
    `Ending equity (base 100): ${data.meta.endingEquity}`,
    '',
    'DISCLAIMER: Synthetic demo data for UI presentation only.',
    'Not live trading history. Do not import into production.',
  ]

  const contentLines = ['BT', '/F1 11 Tf', '50 780 Td', '14 TL']
  lines.forEach((line, i) => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    if (i === 0) {
      contentLines.push(`/F1 16 Tf (${escaped}) Tj`, 'T*', '/F1 11 Tf')
    } else {
      contentLines.push(`(${escaped}) Tj`, 'T*')
    }
  })
  contentLines.push('ET')
  const stream = contentLines.join('\n')

  const objects = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
  )
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream\nendobj\n`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  writeText(path.join(dir, 'backtest-summary.pdf'), pdf)
}

function cleanExportRoot() {
  if (fs.existsSync(EXPORT_ROOT)) {
    fs.rmSync(EXPORT_ROOT, { recursive: true, force: true })
  }
  for (const rel of ['csv', 'json', 'sql', 'prisma', 'reports/html', 'reports/pdf']) {
    ensureDir(path.join(EXPORT_ROOT, rel))
  }
}

function assertDataset(data) {
  const errors = []
  if (data.meta.tradingDayCount < 700) errors.push(`Expected ~3y weekdays, got ${data.meta.tradingDayCount}`)
  if (data.meta.tradeCount < 1000) errors.push(`Expected many trades, got ${data.meta.tradeCount}`)
  const outOfBand = data.monthlyReturns.filter((m) => !m.inPresentationBand)
  if (outOfBand.length > Math.ceil(data.monthlyReturns.length * 0.15)) {
    errors.push(
      `Too many months outside 5–10% band (${outOfBand.length}): ${outOfBand
        .map((m) => `${m.yearMonth}=${m.returnPct}`)
        .join(', ')}`,
    )
  }
  if (errors.length) {
    throw new Error('Dataset validation failed:\n- ' + errors.join('\n- '))
  }
}

function main() {
  console.log('Generating 3-year demo/backtest dataset…')
  cleanExportRoot()
  const data = buildDataset()
  assertDataset(data)

  writeJsonExports(data)
  writeCsvExports(data)
  writeSqlExports(data)
  writePrismaExports(data)
  writeHtmlReport(data)
  writePdfReport(data)
  syncPublicDemoBacktest(data)

  // Mirror disclaimer into export root for convenience
  const disclaimerSrc = path.join(ROOT, '..', 'DISCLAIMER.txt')
  if (fs.existsSync(disclaimerSrc)) {
    fs.copyFileSync(disclaimerSrc, path.join(EXPORT_ROOT, 'DISCLAIMER.txt'))
  }

  console.log('Done.')
  console.log(`  Trading days: ${data.meta.tradingDayCount}`)
  console.log(`  Trades:       ${data.meta.tradeCount}`)
  console.log(`  Months:       ${data.monthlyReturns.length} (in 5–10% band: ${data.dashboardStats.monthsInBand})`)
  console.log(`  Avg monthly:  ${data.dashboardStats.avgMonthlyReturnPct}%`)
  console.log(`  Export root:  ${EXPORT_ROOT}`)
}

try {
  main()
} catch (err) {
  console.error(err instanceof Error ? err.stack || err.message : err)
  process.exit(1)
}
