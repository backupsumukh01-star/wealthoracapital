#!/usr/bin/env node
/**
 * One-time historical TRADE archive generator.
 *
 * Reads the frozen canonical Profit dataset (daily_returns.json) and writes a
 * market-validated Trade History whose strategy P/L sums to each existing
 * daily return. Does NOT regenerate, rebalance, or compound profit data.
 *
 * Usage (repo root):
 *   node demo-data/3-year-backtest/generate-historical-trades.mjs
 *
 * Market data (generation only — never required by the live website):
 *   Yahoo Finance public chart API, daily OHLC for 2022-09-01 → 2026-08-05,
 *   plus 1-hour candles for the last ~730 days (Yahoo's hourly window).
 *
 * After import, production pages must not call this script.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname)
const REPO_ROOT = path.resolve(ROOT, '../..')
const PUBLIC_DIR = path.join(REPO_ROOT, 'apps/web/public/demo/backtest')
const EXPORT_JSON = path.join(ROOT, 'export/json')
const EXPORT_CSV = path.join(ROOT, 'export/csv')
const EXPORT_PRISMA = path.join(ROOT, 'export/prisma')
const API_DATA_DIR = path.join(REPO_ROOT, 'apps/api/data/demo')
const MARKET_CACHE = path.join(ROOT, 'market-cache/yahoo-daily.json')
const HOURLY_CACHE = path.join(ROOT, 'market-cache/yahoo-hourly.json')

export const DATASET_VERSION = 'wealthora-historical-trades-v1'
const PROFIT_SEED = 'wealthora-4y-public-demo-v1'
const START_DATE = '2022-09-01'
const END_DATE = '2026-08-05'
const MICRO = 1_000_000n
const YAHOO_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
const FETCH_GAP_MS = 350

const PAIRS = [
  { pair: 'EUR/USD', yahoo: 'EURUSD=X', digits: 5, pip: 0.0001 },
  { pair: 'GBP/USD', yahoo: 'GBPUSD=X', digits: 5, pip: 0.0001 },
  { pair: 'USD/JPY', yahoo: 'USDJPY=X', digits: 3, pip: 0.01 },
  { pair: 'USD/CHF', yahoo: 'USDCHF=X', digits: 5, pip: 0.0001 },
  { pair: 'AUD/USD', yahoo: 'AUDUSD=X', digits: 5, pip: 0.0001 },
  { pair: 'NZD/USD', yahoo: 'NZDUSD=X', digits: 5, pip: 0.0001 },
  { pair: 'USD/CAD', yahoo: 'USDCAD=X', digits: 5, pip: 0.0001 },
  { pair: 'EUR/JPY', yahoo: 'EURJPY=X', digits: 3, pip: 0.01 },
  { pair: 'GBP/JPY', yahoo: 'GBPJPY=X', digits: 3, pip: 0.01 },
  { pair: 'EUR/GBP', yahoo: 'EURGBP=X', digits: 5, pip: 0.0001 },
  { pair: 'AUD/JPY', yahoo: 'AUDJPY=X', digits: 3, pip: 0.01 },
  { pair: 'XAU/USD', yahoo: 'GC=F', digits: 2, pip: 0.1 },
]
const STRATEGIES = ['AI Momentum', 'Mean Reversion', 'Session Breakout', 'Carry Overlay', 'Volatility Spike']
const COUNT_BAG = [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hashSeed(str) {
  return createHash('sha256').update(str).digest().readUInt32BE(0)
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)]
}

function roundTo(n, digits) {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

function uuidFrom(parts) {
  const h = createHash('sha256').update(parts.join('|')).digest('hex')
  const bytes = Buffer.from(h, 'hex')
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function refFrom(i) {
  return `TRD-H${String(i).padStart(6, '0')}`
}

function toMicro(n) {
  return BigInt(Math.round(Number(n) * Number(MICRO)))
}

function fromMicro(v) {
  const neg = v < 0n
  const abs = neg ? -v : v
  const whole = abs / MICRO
  const frac = abs % MICRO
  const s = `${whole}.${String(frac).padStart(6, '0')}`
  return Number(neg ? `-${s}` : s)
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function writeJson(file, data) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function csvEscape(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows, columns) {
  const header = columns.join(',')
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n')
  return header + '\n' + body + (body ? '\n' : '')
}

function isoFromYahooTs(ts, gmtoffset) {
  return new Date((Number(ts) + Number(gmtoffset || 0)) * 1000).toISOString().slice(0, 10)
}

function barOk(bar) {
  return (
    bar &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    bar.high >= bar.low &&
    bar.high > 0 &&
    bar.low > 0
  )
}

function inRange(bar, price, eps) {
  return price + eps >= bar.low && price - eps <= bar.high
}

async function yahooChart(symbol, params) {
  const usp = new URLSearchParams(params)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${usp}`
  let lastErr = null
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(400 * attempt)
    try {
      const res = await fetch(url, { headers: { 'User-Agent': YAHOO_UA, Accept: 'application/json' } })
      if (!res.ok) {
        lastErr = new Error(`${symbol} HTTP ${res.status}`)
        continue
      }
      const json = await res.json()
      const err = json?.chart?.error
      if (err) {
        lastErr = new Error(`${symbol} ${err.description || err.code}`)
        continue
      }
      const row = json?.chart?.result?.[0]
      if (!row?.timestamp?.length) {
        lastErr = new Error(`${symbol} empty chart`)
        continue
      }
      return row
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error(`Yahoo chart failed for ${symbol}`)
}

function parseDailyChart(row) {
  const gmtoffset = row.meta?.gmtoffset ?? 0
  const q = row.indicators?.quote?.[0] || {}
  const out = {}
  for (let i = 0; i < row.timestamp.length; i++) {
    const bar = {
      open: q.open?.[i],
      high: q.high?.[i],
      low: q.low?.[i],
      close: q.close?.[i],
      ts: row.timestamp[i],
    }
    if (!barOk(bar)) continue
    out[isoFromYahooTs(row.timestamp[i], gmtoffset)] = bar
  }
  return out
}

function parseHourlyChart(row) {
  const gmtoffset = row.meta?.gmtoffset ?? 0
  const q = row.indicators?.quote?.[0] || {}
  const byDate = new Map()
  for (let i = 0; i < row.timestamp.length; i++) {
    const bar = {
      open: q.open?.[i],
      high: q.high?.[i],
      low: q.low?.[i],
      close: q.close?.[i],
      ts: row.timestamp[i],
    }
    if (!barOk(bar)) continue
    const date = isoFromYahooTs(row.timestamp[i], gmtoffset)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(bar)
  }
  for (const bars of byDate.values()) bars.sort((a, b) => a.ts - b.ts)
  return byDate
}

async function loadDailyCache() {
  const period1 = String(Math.floor(Date.UTC(2022, 8, 1) / 1000))
  const period2 = String(Math.floor(Date.UTC(2026, 7, 6) / 1000))
  if (fs.existsSync(MARKET_CACHE) && process.env.REFRESH_MARKET_CACHE !== '1') {
    const cached = JSON.parse(fs.readFileSync(MARKET_CACHE, 'utf8'))
    if (cached?.provider === 'yahoo-finance-chart' && cached?.pairs) {
      console.log(`  Market cache: ${MARKET_CACHE}`)
      return cached
    }
  }

  console.log('  Fetching Yahoo Finance daily OHLC (generation only)…')
  const pairs = {}
  for (const meta of PAIRS) {
    const row = await yahooChart(meta.yahoo, { period1, period2, interval: '1d' })
    pairs[meta.pair] = parseDailyChart(row)
    console.log(`    ${meta.pair} daily bars: ${Object.keys(pairs[meta.pair]).length}`)
    await sleep(FETCH_GAP_MS)
  }
  const payload = {
    provider: 'yahoo-finance-chart',
    fetchedAt: new Date().toISOString(),
    period: { start: START_DATE, end: END_DATE },
    pairs,
  }
  writeJson(MARKET_CACHE, payload)
  return payload
}

function hourlyFromCache(payload) {
  const hourly = new Map()
  for (const [pair, dates] of Object.entries(payload.pairs || {})) {
    const byDate = new Map()
    for (const [date, bars] of Object.entries(dates)) {
      byDate.set(
        date,
        bars.map((b) => ({ ...b })).sort((a, c) => a.ts - c.ts),
      )
    }
    hourly.set(pair, byDate)
  }
  return hourly
}

function hourlyToCache(hourly) {
  const pairs = {}
  for (const [pair, byDate] of hourly) {
    pairs[pair] = Object.fromEntries([...byDate.entries()])
  }
  return pairs
}

async function loadHourly(stats) {
  if (process.env.SKIP_HOURLY === '1') return new Map()
  if (fs.existsSync(HOURLY_CACHE) && process.env.REFRESH_MARKET_CACHE !== '1') {
    const cached = JSON.parse(fs.readFileSync(HOURLY_CACHE, 'utf8'))
    if (cached?.provider === 'yahoo-finance-chart' && cached?.pairs) {
      const hourly = hourlyFromCache(cached)
      stats.hourlyPairs = hourly.size
      console.log(`  Hourly cache: ${HOURLY_CACHE}`)
      return hourly
    }
  }
  console.log('  Fetching Yahoo Finance 1h candles for the last ~730 days…')
  const hourly = new Map()
  for (const meta of PAIRS) {
    try {
      const row = await yahooChart(meta.yahoo, { interval: '1h', range: '2y' })
      hourly.set(meta.pair, parseHourlyChart(row))
      const n = [...hourly.get(meta.pair).values()].reduce((a, b) => a + b.length, 0)
      console.log(`    ${meta.pair} hourly bars: ${n}`)
      stats.hourlyPairs += 1
    } catch (err) {
      console.warn(`    ${meta.pair} hourly skipped: ${err instanceof Error ? err.message : err}`)
      stats.hourlyFetchFailures += 1
    }
    await sleep(FETCH_GAP_MS)
  }
  writeJson(HOURLY_CACHE, {
    provider: 'yahoo-finance-chart',
    fetchedAt: new Date().toISOString(),
    pairs: hourlyToCache(hourly),
  })
  return hourly
}

function previousSession(dailyMap, date) {
  const keys = Object.keys(dailyMap).sort()
  const idx = keys.findIndex((d) => d >= date)
  const start = idx === -1 ? keys.length - 1 : idx - 1
  for (let i = start; i >= 0; i--) {
    if (keys[i] < date && barOk(dailyMap[keys[i]])) return { date: keys[i], bar: dailyMap[keys[i]] }
  }
  return null
}

function pickPricesFromBar(bar, meta, direction, isWin, salt) {
  const range = bar.high - bar.low
  const minMove = Math.max(meta.pip, range * 0.08)
  if (range < minMove) return null
  const a = 0.12 + (salt % 5) * 0.04
  const b = 0.72 + (salt % 4) * 0.05
  const lo = bar.low + range * Math.min(a, 0.4)
  const hi = bar.low + range * Math.min(Math.max(b, a + 0.2), 0.95)
  if (hi - lo < minMove) return null
  let entry
  let exit
  if (direction === 'BUY') {
    entry = isWin ? lo : hi
    exit = isWin ? hi : lo
  } else {
    entry = isWin ? hi : lo
    exit = isWin ? lo : hi
  }
  entry = roundTo(entry, meta.digits)
  exit = roundTo(exit, meta.digits)
  const eps = meta.pip / 2
  if (!inRange(bar, entry, eps) || !inRange(bar, exit, eps)) return null
  if (direction === 'BUY' && isWin && !(exit > entry)) return null
  if (direction === 'BUY' && !isWin && !(exit < entry)) return null
  if (direction === 'SELL' && isWin && !(exit < entry)) return null
  if (direction === 'SELL' && !isWin && !(exit > entry)) return null
  if (entry === exit) return null
  return { entry, exit }
}

function hourlySupports(hours, entry, exit, direction, eps) {
  if (!hours?.length) return null
  let entryIdx = -1
  for (let i = 0; i < hours.length; i++) {
    if (inRange(hours[i], entry, eps)) {
      entryIdx = i
      break
    }
  }
  if (entryIdx < 0) return null
  for (let j = entryIdx; j < hours.length; j++) {
    if (!inRange(hours[j], exit, eps)) continue
    const openBar = hours[entryIdx]
    const closeBar = hours[j]
    if (j === entryIdx) {
      if (direction === 'BUY' && exit > entry && closeBar.high + eps >= exit && closeBar.low - eps <= entry) {
        return { openBar, closeBar, sameCandle: true }
      }
      if (direction === 'SELL' && exit < entry && closeBar.low - eps <= exit && closeBar.high + eps >= entry) {
        return { openBar, closeBar, sameCandle: true }
      }
      if (direction === 'BUY' && exit < entry && closeBar.low - eps <= exit && closeBar.high + eps >= entry) {
        return { openBar, closeBar, sameCandle: true }
      }
      if (direction === 'SELL' && exit > entry && closeBar.high + eps >= exit && closeBar.low - eps <= entry) {
        return { openBar, closeBar, sameCandle: true }
      }
      continue
    }
    return { openBar, closeBar, sameCandle: false }
  }
  return null
}

function pickHourlyPrices(hours, meta, direction, isWin, salt) {
  if (!hours || hours.length < 1) return null
  const i0 = Math.min(salt % hours.length, hours.length - 1)
  const i1 = Math.min(i0 + 1 + (salt % Math.max(1, hours.length - i0)), hours.length - 1)
  const early = hours[Math.min(i0, i1)]
  const late = hours[Math.max(i0, i1)]
  const combo = pickPricesFromBar(
    {
      open: early.open,
      high: Math.max(early.high, late.high),
      low: Math.min(early.low, late.low),
      close: late.close,
    },
    meta,
    direction,
    isWin,
    salt,
  )
  if (!combo) return null
  const path = hourlySupports(hours, combo.entry, combo.exit, direction, meta.pip / 2)
  if (!path) return null
  return { ...combo, path }
}

function allocateMicros(targetMicro, count, wantWin, rand) {
  const parts = []
  let assigned = 0n
  const absT = targetMicro < 0n ? -targetMicro : targetMicro
  const base = absT === 0n ? 80_000n : absT / BigInt(Math.max(count, 1))
  for (let i = 0; i < count - 1; i++) {
    const jitter = BigInt(Math.floor(rand() * 90_000) + 40_000)
    let mag = base / 2n + jitter
    if (mag < 10_000n) mag = 10_000n
    const signed = wantWin[i] ? mag : -mag
    parts.push(signed)
    assigned += signed
  }
  parts.push(targetMicro - assigned)
  return parts
}

function wantedWinsForDay(targetMicro, count, runningWins, runningTotal, rand) {
  const want = Array.from({ length: count }, () => true)
  const projected = runningTotal === 0 ? 0.8 : runningWins / runningTotal
  let losses = 0
  if (count >= 2 && (projected > 0.82 || rand() < 0.22)) losses = 1
  if (count >= 4 && rand() < 0.12) losses = 2
  if (targetMicro < 0n) losses = Math.max(losses, 1)
  const idxs = [...Array(count).keys()]
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
  }
  for (let k = 0; k < losses && k < count; k++) want[idxs[k]] = false
  return want
}

function buildTradeClock(dayIso, path, rand) {
  const [y, m, d] = dayIso.split('-').map(Number)
  if (path?.openBar?.ts && path?.closeBar?.ts) {
    const openTime = new Date(path.openBar.ts * 1000)
    let closeTime = new Date(path.closeBar.ts * 1000)
    if (closeTime <= openTime) closeTime = new Date(openTime.getTime() + (20 + Math.floor(rand() * 90)) * 60_000)
    return { openTime: openTime.toISOString(), closeTime: closeTime.toISOString() }
  }
  const openHour = 7 + Math.floor(rand() * 8)
  const durationMin = 25 + Math.floor(rand() * 280)
  const openTime = new Date(Date.UTC(y, m - 1, d, openHour, Math.floor(rand() * 60), 0))
  const closeTime = new Date(openTime.getTime() + durationMin * 60_000)
  return { openTime: openTime.toISOString(), closeTime: closeTime.toISOString() }
}

export function reconcileDay(trades, targetPct) {
  const sum = trades.reduce((acc, t) => acc + toMicro(t.returnPct), 0n)
  return sum === toMicro(targetPct)
}

function writeTradeCsv(trades, file) {
  writeText(
    file,
    toCsv(trades, [
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
      'datasetVersion',
    ]),
  )
}

function writeText(file, text) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, text, 'utf8')
}

async function generate() {
  const dailyPath = path.join(PUBLIC_DIR, 'daily_returns.json')
  const statsPath = path.join(PUBLIC_DIR, 'dashboard_stats.json')
  const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf8'))
  const dashboardStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'))
  const profitSnapshot = daily.map((d) => ({
    id: d.id,
    date: d.date,
    netReturnPct: d.netReturnPct,
    computedReturnPct: d.computedReturnPct,
  }))

  if (daily[0]?.date !== START_DATE || daily[daily.length - 1]?.date !== END_DATE) {
    throw new Error(`Unexpected profit period ${daily[0]?.date} → ${daily[daily.length - 1]?.date}`)
  }

  const stats = {
    hourlyPairs: 0,
    hourlyFetchFailures: 0,
    rejectedCandidates: 0,
    historicalValidationFailures: 0,
    previousSessionFallbacks: 0,
    duplicateSkips: 0,
    created: 0,
  }

  const dailyMarket = await loadDailyCache()
  const hourlyMarket = await loadHourly(stats)

  const trades = []
  const seenKeys = new Set()
  let runningWins = 0
  let runningTotal = 0
  let seq = 1
  const buySell = { BUY: 0, SELL: 0 }
  const pairDist = Object.fromEntries(PAIRS.map((p) => [p.pair, 0]))
  const countDist = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const reconFailures = []

  for (const day of daily) {
    const date = day.date
    const rand = mulberry32(hashSeed(`${DATASET_VERSION}|${date}|${PROFIT_SEED}`))
    const targetPct = day.netReturnPct
    const targetMicro = toMicro(targetPct)
    const tradeCount = COUNT_BAG[Math.floor(rand() * COUNT_BAG.length)]
    const wantWin = wantedWinsForDay(targetMicro, tradeCount, runningWins, runningTotal, rand)
    let micros = allocateMicros(targetMicro, tradeCount, wantWin, rand)
    if (micros.reduce((a, b) => a + b, 0n) !== targetMicro) {
      throw new Error(`Allocation drift on ${date}`)
    }

    const dayTrades = []
    const usedPairs = new Set()

    for (let i = 0; i < tradeCount; i++) {
      const retMicro = micros[i]
      const isWin = retMicro > 0n
      const isFlat = retMicro === 0n
      if (isFlat && i < tradeCount - 1) {
        micros[i] += 1n
        micros[micros.length - 1] -= 1n
      }
      const outcomeWin = micros[i] > 0n
      let placed = null
      const dirBias = buySell.BUY <= buySell.SELL ? 'BUY' : 'SELL'
      const directionFirst = rand() > 0.46 ? dirBias : dirBias === 'BUY' ? 'SELL' : 'BUY'
      const directions = directionFirst === 'BUY' ? ['BUY', 'SELL'] : ['SELL', 'BUY']
      const pairOrder = [...PAIRS].sort((a, b) => {
        const au = usedPairs.has(a.pair) ? 1 : 0
        const bu = usedPairs.has(b.pair) ? 1 : 0
        if (au !== bu) return au - bu
        return pairDist[a.pair] - pairDist[b.pair]
      })

      candidateLoop: for (const direction of directions) {
        for (const meta of pairOrder) {
          const dailyMap = dailyMarket.pairs[meta.pair] || {}
          let sessionDate = date
          let bar = dailyMap[date]
          let fallback = false
          if (!barOk(bar)) {
            const prev = previousSession(dailyMap, date)
            if (!prev) {
              stats.rejectedCandidates += 1
              continue
            }
            bar = prev.bar
            sessionDate = prev.date
            fallback = true
          }
          const hours = hourlyMarket.get(meta.pair)?.get(sessionDate) || null
          const salt = Math.floor(rand() * 97)
          let combo = hours ? pickHourlyPrices(hours, meta, direction, outcomeWin, salt) : null
          if (!combo) combo = pickPricesFromBar(bar, meta, direction, outcomeWin, salt)
          if (!combo) {
            stats.rejectedCandidates += 1
            stats.historicalValidationFailures += 1
            continue
          }
          const eps = meta.pip / 2
          if (!inRange(bar, combo.entry, eps) || !inRange(bar, combo.exit, eps)) {
            stats.historicalValidationFailures += 1
            stats.rejectedCandidates += 1
            continue
          }
          const granularity = combo.path ? '1h' : '1d'
          if (fallback) stats.previousSessionFallbacks += 1
          placed = {
            meta,
            direction,
            combo,
            bar,
            sessionDate,
            fallback,
            granularity,
          }
          break candidateLoop
        }
      }

      if (!placed) {
        reconFailures.push({ date, reason: 'no_validated_candidate' })
        stats.historicalValidationFailures += 1
        continue
      }

      const ret = fromMicro(micros[i])
      const outcome = ret > 0 ? 'WIN' : ret < 0 ? 'LOSS' : 'BREAKEVEN'
      const clock = buildTradeClock(date, placed.combo.path, rand)
      const id = uuidFrom([DATASET_VERSION, 'trade', date, String(seq)])
      const idempotencyKey = `${DATASET_VERSION}|${date}|${placed.meta.pair}|${placed.direction}|${placed.combo.entry}|${placed.combo.exit}|${seq}`
      if (seenKeys.has(idempotencyKey)) {
        stats.duplicateSkips += 1
        seq += 1
        continue
      }
      seenKeys.add(idempotencyKey)

      const pips = roundTo(Math.abs(placed.combo.exit - placed.combo.entry) / placed.meta.pip, 2)
      dayTrades.push({
        id,
        reference: refFrom(seq),
        tradeDate: date,
        pair: placed.meta.pair,
        direction: placed.direction,
        strategy: pick(STRATEGIES, rand),
        risk: pick(['LOW', 'MEDIUM', 'HIGH'], rand),
        lotSize: roundTo(0.1 + rand() * 2.4, 2),
        entryPrice: placed.combo.entry,
        exitPrice: placed.combo.exit,
        stopLoss: roundTo(placed.combo.entry * (placed.direction === 'BUY' ? 0.998 : 1.002), placed.meta.digits),
        takeProfit: roundTo(placed.combo.entry * (placed.direction === 'BUY' ? 1.004 : 0.996), placed.meta.digits),
        openTime: clock.openTime,
        closeTime: clock.closeTime,
        status: 'CLOSED',
        outcome,
        returnPct: ret,
        pips,
        isPublic: true,
        profitAmount: ret >= 0 ? roundTo(Math.abs(ret) * 120, 2) : null,
        lossAmount: ret < 0 ? roundTo(Math.abs(ret) * 120, 2) : null,
        tradingDayId: day.id,
        datasetVersion: DATASET_VERSION,
        disclosure: 'Reconstructed/backtest desk record from historical market prices. Not a live executed fill.',
        marketValidation: {
          provider: 'yahoo-finance-chart',
          yahooSymbol: placed.meta.yahoo,
          granularity: placed.granularity,
          tradeDate: date,
          priceSessionDate: placed.sessionDate,
          ohlc: {
            open: roundTo(placed.bar.open, placed.meta.digits),
            high: roundTo(placed.bar.high, placed.meta.digits),
            low: roundTo(placed.bar.low, placed.meta.digits),
            close: roundTo(placed.bar.close, placed.meta.digits),
          },
          sameCandle: Boolean(placed.combo.path?.sameCandle),
        },
        idempotencyKey,
      })
      usedPairs.add(placed.meta.pair)
      pairDist[placed.meta.pair] += 1
      buySell[placed.direction] += 1
      runningTotal += 1
      if (outcome === 'WIN') runningWins += 1
      seq += 1
      stats.created += 1
    }

    if (dayTrades.length === 0 || !reconcileDay(dayTrades, targetPct)) {
      reconFailures.push({
        date,
        target: targetPct,
        sum: fromMicro(dayTrades.reduce((a, t) => a + toMicro(t.returnPct), 0n)),
        count: dayTrades.length,
      })
    } else {
      const winCount = dayTrades.filter((t) => t.outcome === 'WIN').length
      const lossCount = dayTrades.filter((t) => t.outcome === 'LOSS').length
      day.tradeCount = dayTrades.length
      day.winCount = winCount
      day.lossCount = lossCount
      day.summary =
        targetPct >= 0
          ? `Desk closed ${dayTrades.length} tickets; net +${Number(targetPct).toFixed(2)}%.`
          : `Desk closed ${dayTrades.length} tickets; net ${Number(targetPct).toFixed(2)}%.`
      countDist[dayTrades.length] += 1
      trades.push(...dayTrades)
    }
  }

  if (reconFailures.length) {
    writeJson(path.join(PUBLIC_DIR, 'historical-trades-validation.json'), {
      datasetVersion: DATASET_VERSION,
      ok: false,
      dailyReconciliationFailures: reconFailures.length,
      reconFailures: reconFailures.slice(0, 50),
      stats,
    })
    throw new Error(`Daily reconciliation failures: ${reconFailures.length}`)
  }

  for (let i = 0; i < daily.length; i++) {
    if (daily[i].id !== profitSnapshot[i].id) throw new Error('Profit id mutated')
    if (daily[i].date !== profitSnapshot[i].date) throw new Error('Profit date mutated')
    if (daily[i].netReturnPct !== profitSnapshot[i].netReturnPct) throw new Error(`Profit netReturnPct mutated on ${daily[i].date}`)
    if (daily[i].computedReturnPct !== profitSnapshot[i].computedReturnPct) {
      throw new Error(`Profit computedReturnPct mutated on ${daily[i].date}`)
    }
  }

  const wins = trades.filter((t) => t.outcome === 'WIN').length
  const losses = trades.filter((t) => t.outcome === 'LOSS').length
  dashboardStats.tradeCount = trades.length
  dashboardStats.winCount = wins
  dashboardStats.lossCount = losses

  const report = {
    datasetVersion: DATASET_VERSION,
    profitSeed: PROFIT_SEED,
    provider: 'yahoo-finance-chart',
    disclosure:
      'Reconstructed/backtest trade archive validated against historical Yahoo Finance OHLC. Not live executed fills. Canonical daily profit remains wealthora-4y-public-demo-v1.',
    dateRange: { start: START_DATE, end: END_DATE },
    totalTradingDays: daily.length,
    totalTrades: trades.length,
    winningTrades: wins,
    losingTrades: losses,
    winPercentage: trades.length ? Math.round((wins / trades.length) * 10000) / 100 : 0,
    averageTradesPerDay: Math.round((trades.length / daily.length) * 100) / 100,
    tradesPerDayDistribution: countDist,
    pairDistribution: pairDist,
    buyCount: buySell.BUY,
    sellCount: buySell.SELL,
    rejectedCandidates: stats.rejectedCandidates,
    historicalValidationFailures: stats.historicalValidationFailures,
    dailyReconciliationFailures: 0,
    previousSessionFallbacks: stats.previousSessionFallbacks,
    duplicateSkips: stats.duplicateSkips,
    importCount: stats.created,
    hourlyCoveragePairs: stats.hourlyPairs,
    hourlyFetchFailures: stats.hourlyFetchFailures,
    ok: true,
  }

  const files = [
    path.join(PUBLIC_DIR, 'trades.json'),
    path.join(EXPORT_JSON, 'trades.json'),
    path.join(API_DATA_DIR, 'trades.json'),
  ]
  for (const file of files) writeJson(file, trades)
  writeJson(path.join(EXPORT_PRISMA, 'trades.seed.json'), trades.map(({ tradingDayId, ...rest }) => rest))
  writeJson(path.join(PUBLIC_DIR, 'daily_returns.json'), daily)
  writeJson(path.join(EXPORT_JSON, 'daily_returns.json'), daily)
  writeJson(path.join(EXPORT_JSON, 'trading_days.json'), daily)
  writeJson(path.join(PUBLIC_DIR, 'dashboard_stats.json'), dashboardStats)
  writeJson(path.join(EXPORT_JSON, 'dashboard_stats.json'), dashboardStats)
  writeJson(path.join(PUBLIC_DIR, 'historical-trades-validation.json'), report)
  writeJson(path.join(EXPORT_JSON, 'historical-trades-validation.json'), report)
  writeTradeCsv(trades, path.join(PUBLIC_DIR, 'trades.csv'))
  writeTradeCsv(trades, path.join(EXPORT_CSV, 'trades.csv'))
  writeText(
    path.join(PUBLIC_DIR, 'trading_days.csv'),
    toCsv(daily, [
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
    path.join(EXPORT_CSV, 'trading_days.csv'),
    toCsv(daily, [
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
    path.join(PUBLIC_DIR, 'dashboard_stats.csv'),
    toCsv([dashboardStats], [
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
  writeText(
    path.join(EXPORT_CSV, 'dashboard_stats.csv'),
    toCsv([dashboardStats], [
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

  console.log(JSON.stringify(report, null, 2))
  return report
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    await generate()
  } catch (err) {
    console.error(err instanceof Error ? err.stack || err.message : err)
    process.exit(1)
  }
}
