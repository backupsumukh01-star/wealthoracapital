#!/usr/bin/env node
/**
 * Build institutional Wealthora-branded HTML performance reports from existing
 * demo/backtest JSON (does not regenerate trade/backtest data).
 *
 * Period-specific reports (daily / weekly / monthly / quarterly / yearly)
 * compute KPIs, charts, tables and narrative from the filtered slice only.
 * Archive reports keep the full 2022-09-01 → 2026-08-05 ledger.
 *
 *   node scripts/generate-hpc-reports.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../apps/web/public/demo/backtest')
const dir = path.join(root, 'reports')
fs.mkdirSync(dir, { recursive: true })

const stats = JSON.parse(fs.readFileSync(path.join(root, 'dashboard_stats.json'), 'utf8'))
const monthly = JSON.parse(fs.readFileSync(path.join(root, 'monthly_returns.json'), 'utf8'))
const charts = JSON.parse(fs.readFileSync(path.join(root, 'charts.json'), 'utf8'))
const trades = JSON.parse(fs.readFileSync(path.join(root, 'trades.json'), 'utf8'))
const daily = JSON.parse(fs.readFileSync(path.join(root, 'daily_returns.json'), 'utf8'))
const meta = charts.meta
const generatedAt = new Date().toISOString()
const version = '2.2.0'
const PRINCIPAL = 100
const ARCHIVE_SEED = 'wealthora-4y-public-demo-v1'

function simpleSum(arr) {
  return arr.reduce((a, r) => a + r.returnPct, 0)
}
function fmt(n, d = 2) {
  return Number(n).toFixed(d)
}
function reportId(key) {
  return `GZ-${createHash('sha1').update(`${key}-${meta.startDate}-${meta.endDate}-${version}`).digest('hex').slice(0, 10).toUpperCase()}`
}
function dayReturn(d) {
  return Number(d.netReturnPct ?? d.computedReturnPct ?? 0)
}
function isoDay(d) {
  return d.toISOString().slice(0, 10)
}
function clip(iso, lo, hi) {
  if (iso < lo) return lo
  if (iso > hi) return hi
  return iso
}
function mondaySundayWeek(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  const dow = d.getUTCDay()
  const off = dow === 0 ? 6 : dow - 1
  const start = new Date(d)
  start.setUTCDate(d.getUTCDate() - off)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  return { start: isoDay(start), end: isoDay(end) }
}
function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = isoDay(new Date(Date.UTC(year, month, 0)))
  return { start, end }
}
function quarterBounds(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1
  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`
  const end = isoDay(new Date(Date.UTC(year, startMonth + 2, 0)))
  return { start, end }
}

const byYear = {}
for (const m of monthly) (byYear[m.year] ||= []).push(m)
const years = Object.keys(byYear).sort()
const latestMonth = monthly[monthly.length - 1]
const latestYear = years[years.length - 1]
const q = Math.floor((latestMonth.month - 1) / 3) + 1
const qMonths = monthly.filter(
  (m) => m.year === latestMonth.year && Math.floor((m.month - 1) / 3) + 1 === q,
)
const archiveBestMonth = monthly.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
const archiveWorstMonth = monthly.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
const archiveWins = trades.filter((t) => t.outcome === 'WIN' || t.returnPct > 0)
const archiveLosses = trades.filter((t) => t.outcome === 'LOSS' || t.returnPct < 0)
const archiveLargestGain = trades.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
const archiveLargestLoss = trades.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
const simpleAnnualized =
  stats.simpleAnnualizedReturnPct ?? Number(stats.avgMonthlyReturnPct) * 12
const lastTradingDay = daily[daily.length - 1].date

function computeSlice(start, end) {
  const lo = clip(start, meta.startDate, meta.endDate)
  const hi = clip(end, meta.startDate, meta.endDate)
  const days = daily.filter((d) => d.date >= lo && d.date <= hi)
  const sliceTrades = trades.filter((t) => t.tradeDate >= lo && t.tradeDate <= hi)
  const months = monthly.filter((m) => m.yearMonth >= lo.slice(0, 7) && m.yearMonth <= hi.slice(0, 7))
  const simpleReturn = days.reduce((s, d) => s + dayReturn(d), 0)
  const profit = PRINCIPAL * (simpleReturn / 100)
  const ending = PRINCIPAL + profit
  const winTrades = sliceTrades.filter((t) => t.outcome === 'WIN' || t.returnPct > 0)
  const lossTrades = sliceTrades.filter((t) => t.outcome === 'LOSS' || t.returnPct < 0)
  const tradeWinRate = sliceTrades.length ? (winTrades.length / sliceTrades.length) * 100 : 0
  const winningDays = days.filter((d) => dayReturn(d) > 0)
  const dayWinRate = days.length ? (winningDays.length / days.length) * 100 : 0
  const bestDay = days.length ? days.reduce((a, b) => (dayReturn(b) > dayReturn(a) ? b : a)) : null
  const worstDay = days.length ? days.reduce((a, b) => (dayReturn(b) < dayReturn(a) ? b : a)) : null
  const bestMonth = months.length
    ? months.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
    : null
  const worstMonth = months.length
    ? months.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
    : null
  const largestGain = sliceTrades.length
    ? sliceTrades.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
    : null
  const largestLoss = sliceTrades.length
    ? sliceTrades.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
    : null
  const avgMonthly = months.length ? months.reduce((s, m) => s + m.returnPct, 0) / months.length : null
  let running = PRINCIPAL
  const equityCurve = [{ date: lo, equity: PRINCIPAL, returnPct: 0 }]
  for (const d of days) {
    running += PRINCIPAL * (dayReturn(d) / 100)
    equityCurve.push({ date: d.date, equity: running, returnPct: dayReturn(d) })
  }
  const yearsInSlice = [...new Set(months.map((m) => String(m.year)))].sort()
  return {
    start: lo,
    end: hi,
    days,
    trades: sliceTrades,
    months,
    years: yearsInSlice,
    simpleReturn,
    profit,
    ending,
    winTrades,
    lossTrades,
    tradeWinRate,
    dayWinRate,
    winningDays,
    bestDay,
    worstDay,
    bestMonth,
    worstMonth,
    largestGain,
    largestLoss,
    avgMonthly,
    tradingDays: days.length,
    tradeCount: sliceTrades.length,
    equityCurve,
  }
}

const weekRange = mondaySundayWeek(lastTradingDay)
const monthRange = monthBounds(latestMonth.year, latestMonth.month)
const quarterRange = quarterBounds(latestMonth.year, q)
const yearRange = { start: `${latestYear}-01-01`, end: `${latestYear}-12-31` }

const slices = {
  daily: computeSlice(lastTradingDay, lastTradingDay),
  weekly: computeSlice(weekRange.start, weekRange.end),
  monthly: computeSlice(monthRange.start, monthRange.end),
  quarterly: computeSlice(quarterRange.start, quarterRange.end),
  yearly: computeSlice(yearRange.start, yearRange.end),
  archive: computeSlice(meta.startDate, meta.endDate),
}

function downsample(points, max = 80) {
  if (!points.length) return points
  const step = Math.max(1, Math.ceil(points.length / max))
  return points.filter((_, i) => i % step === 0 || i === points.length - 1)
}

function svgEquity(curve, gid = 'eqg') {
  const w = 640
  const h = 200
  const pad = 24
  const eqPts = downsample(curve, 80)
  const vals = eqPts.map((p) => p.equity)
  const min = Math.min(...vals) * 0.98
  const max = Math.max(...vals) * 1.02
  const coords = eqPts.map((p, i) => {
    const x = pad + (i / Math.max(eqPts.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - (p.equity - min) / (max - min || 1)) * (h - pad * 2)
    return `${x},${y}`
  })
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Equity curve"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3CCB91" stop-opacity="0.45"/><stop offset="100%" stop-color="#3CCB91" stop-opacity="0"/></linearGradient></defs><polyline fill="none" stroke="#3CCB91" stroke-width="2.5" points="${coords.join(' ')}"/><polygon fill="url(#${gid})" points="${pad},${h - pad} ${coords.join(' ')} ${w - pad},${h - pad}"/></svg>`
}

function svgMonthlyBars(rows) {
  const w = 640
  const h = 200
  const pad = 28
  const list = rows.length ? rows : [{ returnPct: 0 }]
  const maxAbs = Math.max(...list.map((r) => Math.abs(r.returnPct)), 1)
  const bw = (w - pad * 2) / list.length
  const bars = list
    .map((r, i) => {
      const mag = (Math.abs(r.returnPct) / maxAbs) * (h / 2 - 16)
      const x = pad + i * bw + 1
      const up = r.returnPct >= 0
      const y = up ? h / 2 - mag : h / 2
      return `<rect x="${x}" y="${y}" width="${Math.max(bw - 2, 1)}" height="${mag}" rx="2" fill="${up ? '#3CCB91' : '#E05C67'}"/>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Period returns"><line x1="${pad}" x2="${w - pad}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(255,255,255,0.15)"/><g>${bars}</g></svg>`
}

function svgYearly(slice) {
  const rows = slice.years.map((y) => ({
    label: y,
    returnPct: simpleSum(slice.months.filter((m) => String(m.year) === String(y))),
  }))
  return svgMonthlyBars(rows.length ? rows : [{ returnPct: slice.simpleReturn }])
}

function svgDrawdown(curve) {
  const equity = curve.length ? curve : [{ equity: PRINCIPAL }]
  let peak = equity[0]?.equity ?? PRINCIPAL
  const full = equity.map((p) => {
    if (p.equity > peak) peak = p.equity
    return peak > 0 ? ((peak - p.equity) / peak) * 100 : 0
  })
  const dds = downsample(full, 80)
  const w = 640
  const h = 160
  const pad = 24
  const max = Math.max(...dds, 0.05)
  const coords = dds.map((dd, i) => {
    const x = pad + (i / Math.max(dds.length - 1, 1)) * (w - pad * 2)
    const y = pad + (dd / max) * (h - pad * 2)
    return `${x},${y}`
  })
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Drawdown"><defs><linearGradient id="ddg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E05C67" stop-opacity="0.35"/><stop offset="100%" stop-color="#E05C67" stop-opacity="0"/></linearGradient></defs><polygon fill="url(#ddg)" points="${pad},${pad} ${coords.join(' ')} ${w - pad},${pad}"/><polyline fill="none" stroke="#E05C67" stroke-width="2" points="${coords.join(' ')}"/></svg>`
}

function svgWinLoss(winCount, lossCount) {
  const w = 320
  const h = 160
  const total = Math.max(winCount + lossCount, 1)
  const winW = (winCount / total) * (w - 40)
  const lossW = (lossCount / total) * (w - 40)
  return `<svg viewBox="0 0 ${w} ${h}" class="chart chart-sm" role="img" aria-label="Winning vs losing"><rect x="20" y="50" width="${winW}" height="28" rx="6" fill="#3CCB91"/><rect x="${20 + winW}" y="50" width="${lossW}" height="28" rx="6" fill="#E05C67"/><text x="20" y="110" fill="#89939E" font-size="12">Wins ${winCount} · Losses ${lossCount}</text></svg>`
}

function svgAllocation(sliceTrades) {
  const counts = {}
  for (const t of sliceTrades) counts[t.pair] = (counts[t.pair] || 0) + 1
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const total = rows.reduce((s, [, n]) => s + n, 0) || 1
  const colors = ['#3CCB91', '#D4D9DF', '#8FA8C0', '#AAB3BD', '#C9A45C', '#E05C67', '#3CCB91', '#94A3B8']
  const w = 640
  const h = 200
  const barH = 16
  const gap = 8
  const left = 110
  const maxW = w - left - 48
  const bars = (rows.length ? rows : [['—', 0]])
    .map(([pair, n], i) => {
      const y = 20 + i * (barH + gap)
      const bw = (n / total) * maxW
      const pct = ((n / total) * 100).toFixed(1)
      return `<text x="8" y="${y + 12}" fill="#89939E" font-size="11">${pair}</text><rect x="${left}" y="${y}" width="${bw}" height="${barH}" rx="4" fill="${colors[i % colors.length]}"/><text x="${left + bw + 8}" y="${y + 12}" fill="#F2F4F7" font-size="11">${pct}%</text>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Asset allocation">${bars}</svg>`
}

function heatmap(slice) {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const ys = slice.years.length ? slice.years : years
  const cells = ys
    .map((y) => {
      const row = months
        .map((_, mi) => {
          const m = slice.months.find((x) => x.year === Number(y) && x.month === mi + 1)
          if (!m) return `<td class="hm empty">—</td>`
          const tone = m.returnPct >= 0 ? 'pos' : 'neg'
          const alpha = Math.min(0.85, 0.25 + Math.abs(m.returnPct) / 20)
          return `<td class="hm ${tone}" style="--a:${alpha}">${fmt(m.returnPct, 1)}</td>`
        })
        .join('')
      return `<tr><th>${y}</th>${row}</tr>`
    })
    .join('')
  return `<table class="heatmap"><thead><tr><th></th>${months.map((m) => `<th>${m}</th>`).join('')}</tr></thead><tbody>${cells}</tbody></table>`
}

function tradeSample(sliceTrades, n = 24) {
  const rows = [...sliceTrades].slice(-n).reverse()
  return rows
    .map((t) => {
      const up = t.returnPct >= 0
      const icon = up ? '▲' : '▼'
      return `<tr class="${up ? 'win' : 'loss'}"><td class="icon">${icon}</td><td>${t.tradeDate}</td><td>${t.pair}</td><td>${t.direction}</td><td>${fmt(t.entryPrice, 5)}</td><td>${fmt(t.exitPrice, 5)}</td><td class="pct">${up ? '+' : ''}${fmt(t.returnPct, 3)}%</td><td>${t.status}</td></tr>`
    })
    .join('')
}

function dailyTable(slice) {
  const rows = slice.days
    .map((d) => {
      const r = dayReturn(d)
      const profit = PRINCIPAL * (r / 100)
      const up = r >= 0
      return `<tr class="${up ? 'win' : 'loss'}"><td>${d.date}</td><td class="pct">${up ? '+' : ''}${fmt(r, 3)}%</td><td>${d.tradeCount ?? '—'}</td><td>$${fmt(profit, 2)}</td></tr>`
    })
    .join('')
  return `<table class="data"><thead><tr><th>Date</th><th>Daily return</th><th>Trades</th><th>Profit on $100</th></tr></thead><tbody>${rows}</tbody></table>`
}

function monthlyTable(slice) {
  const rows = slice.months
    .map((m) => {
      const profit = PRINCIPAL * (m.returnPct / 100)
      const up = m.returnPct >= 0
      return `<tr class="${up ? 'win' : 'loss'}"><td>${m.label}</td><td class="pct">${up ? '+' : ''}${fmt(m.returnPct, 2)}%</td><td>${m.tradingDays}</td><td>$${fmt(profit, 2)}</td></tr>`
    })
    .join('')
  return `<table class="data"><thead><tr><th>Month</th><th>Simple return</th><th>Trading days</th><th>Profit on $100</th></tr></thead><tbody>${rows}</tbody></table>`
}

const CSS = `
:root{--bg:#07090B;--card:#0D1115;--line:rgba(255,255,255,.08);--fg:#F2F4F7;--muted:#89939E;--accent:#3CCB91;--cyan:#D4D9DF;--loss:#E05C67}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-page{position:relative;min-height:100vh;padding:48px 40px 72px;page-break-after:always;overflow:hidden}
.report-page:last-child{page-break-after:auto}
.watermark{pointer-events:none;position:absolute;inset:0;display:grid;place-items:center;font-size:64px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.03);transform:rotate(-24deg);text-transform:uppercase}
.footer{position:absolute;left:40px;right:40px;bottom:28px;display:flex;justify-content:space-between;gap:12px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px}
.cover{display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(90% 60% at 50% 0%,rgba(60,203,145,.22),transparent 70%),linear-gradient(160deg,#07090B,#0A0D10 45%,#07090B)}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#3CCB91,#D4D9DF);display:grid;place-items:center;font-weight:800;color:#07090B}
.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
h1{font-size:40px;line-height:1.1;margin:12px 0 8px;font-weight:700}
h2{font-size:22px;margin:0 0 16px}
h3{font-size:15px;margin:0 0 10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.sub{color:var(--muted);font-size:15px;max-width:520px}
.meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:28px;max-width:520px}
.meta-card{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.meta-card span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.meta-card strong{display:block;margin-top:6px;font-size:15px}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0 22px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px}
.card span{display:block;font-size:11px;color:var(--muted)}
.card strong{display:block;margin-top:8px;font-size:20px;font-variant-numeric:tabular-nums}
.card.pos strong{color:var(--accent)}
.card.neg strong{color:var(--loss)}
.panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:16px}
.chart{width:100%;height:auto;display:block}
.chart-sm{max-width:360px}
table.data{width:100%;border-collapse:collapse;font-size:12px}
table.data th{position:sticky;top:0;background:#122433;text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:600}
table.data td{padding:9px 8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
table.data tr.win td.pct,table.data tr.win td.icon{color:var(--accent)}
table.data tr.loss td.pct,table.data tr.loss td.icon{color:var(--loss)}
table.data tbody tr:nth-child(even){background:rgba(255,255,255,.035)}
table.data tbody tr:hover{background:rgba(60,203,145,.06)}
table.data td.icon{width:18px;text-align:center;font-size:10px}
.heatmap{width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums}
.heatmap th,.heatmap td{padding:6px 4px;text-align:center;border:1px solid var(--line)}
.heatmap .hm.pos{background:rgba(60,203,145,var(--a));color:#07090B}
.heatmap .hm.neg{background:rgba(240,113,120,var(--a));color:#fff}
.heatmap .hm.empty{color:var(--muted)}
.prose{color:var(--muted);font-size:13px;line-height:1.6}
.prose strong{color:var(--fg)}
.badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid rgba(60,203,145,.35);background:rgba(60,203,145,.1);color:var(--accent);font-size:11px;padding:4px 10px}
.grid-2{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
@media (max-width:800px){.report-page{padding:28px 16px 64px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-2,.meta-grid{grid-template-columns:1fr}h1{font-size:28px}}
@media print{.report-page{min-height:auto;height:auto}}
`

function attr(attrs) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `data-${k}="${String(v).replace(/"/g, '')}"`)
    .join(' ')
}

function shell(title, rid, period, pages, dataAttrs) {
  const body = pages
    .map((html, i) => {
      return `<section class="report-page">${html}<div class="watermark">CONFIDENTIAL</div><footer class="footer"><span>Wealthora Capital · ${rid} · v${version}</span><span>Generated ${generatedAt.slice(0, 10)} · Page ${i + 1} of ${pages.length}</span></footer></section>`
    })
    .join('\n')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>${CSS}</style></head><body data-report-id="${rid}" data-period="${period}" data-version="${version}" data-generated="${generatedAt}" ${attr(dataAttrs)}>${body}</body></html>`
}

function cover({ title, periodLabel, period, rid }) {
  return `<div class="cover report-inner" style="min-height:calc(100vh - 120px);display:flex;flex-direction:column;justify-content:space-between">
  <div class="brand"><div class="logo">W</div><div><div class="eyebrow">Wealthora Capital</div><div style="font-size:13px;color:var(--muted)">Public Performance Archive</div></div></div>
  <div>
    <span class="badge">Demo / Backtest Dataset</span>
    <h1>${title}</h1>
    <p class="sub">${periodLabel}. Institutional-style presentation of the seeded historical ledger — not a guarantee of future results.</p>
    <div class="meta-grid">
      <div class="meta-card"><span>Reporting period</span><strong>${period}</strong></div>
      <div class="meta-card"><span>Generated</span><strong>${generatedAt.slice(0, 10)}</strong></div>
      <div class="meta-card"><span>Prepared for</span><strong>Public Performance Archive</strong></div>
      <div class="meta-card"><span>Report ID</span><strong>${rid}</strong></div>
    </div>
  </div>
  <p class="prose">Version ${version} · Wealthora branding · Confidential watermark applies to all pages.</p>
</div>`
}

function kpiCard(label, value, tone, kpi) {
  const toneClass = tone ? ` class="${tone}"` : ''
  return `<div class="card" data-kpi="${kpi}"><span>${label}</span><strong${toneClass}>${value}</strong></div>`
}

function archiveKpiCards() {
  return [
    kpiCard('Avg monthly return', `${fmt(stats.avgMonthlyReturnPct, 2)}%`, 'pos', 'avg-monthly'),
    kpiCard('Total trading days', String(stats.tradingDayCount), '', 'trading-days'),
    kpiCard('Total trades', String(stats.tradeCount), '', 'trade-count'),
    kpiCard('Winning %', `${fmt(stats.winRatePct, 2)}%`, 'pos', 'win-rate'),
    kpiCard('Losing %', `${fmt(100 - stats.winRatePct, 2)}%`, 'neg', 'loss-rate'),
    kpiCard('Best month', `${archiveBestMonth.label} ${fmt(archiveBestMonth.returnPct, 2)}%`, 'pos', 'best-month'),
    kpiCard('Worst month', `${archiveWorstMonth.label} ${fmt(archiveWorstMonth.returnPct, 2)}%`, 'neg', 'worst-month'),
    kpiCard('Ending equity ($100)', fmt(meta.endingEquity, 1), '', 'ending'),
    kpiCard('Largest gain', `${archiveLargestGain.pair} ${fmt(archiveLargestGain.returnPct, 2)}%`, 'pos', 'largest-gain'),
    kpiCard('Largest loss', `${archiveLargestLoss.pair} ${fmt(archiveLargestLoss.returnPct, 2)}%`, 'neg', 'largest-loss'),
    kpiCard('Total return', `${fmt(meta.totalReturnPct, 1)}%`, 'pos', 'total-return'),
    kpiCard('Annualized simple return', `${fmt(simpleAnnualized, 2)}%`, '', 'annualized'),
  ].join('')
}

function periodKpiCards(kind, slice) {
  const winRate = slice.tradeWinRate
  const lossRate = 100 - winRate
  const profitLabel =
    kind === 'daily'
      ? 'Daily profit on $100'
      : kind === 'weekly'
        ? 'Weekly profit on $100'
        : kind === 'monthly'
          ? 'Monthly profit on $100'
          : kind === 'quarterly'
            ? 'Quarterly profit on $100'
            : 'Annual profit on $100'
  const returnLabel =
    kind === 'daily'
      ? 'Daily return'
      : kind === 'weekly'
        ? 'Weekly simple return'
        : kind === 'monthly'
          ? 'Monthly simple return'
          : kind === 'quarterly'
            ? 'Quarterly simple return'
            : 'Annual simple return'
  const daysLabel =
    kind === 'daily'
      ? 'Trading days'
      : kind === 'weekly'
        ? 'Trading days in week'
        : kind === 'monthly'
          ? 'Trading days in month'
          : kind === 'quarterly'
            ? 'Trading days in quarter'
            : 'Trading days in year'
  const bestDay = slice.bestDay
    ? `${slice.bestDay.date} ${fmt(dayReturn(slice.bestDay), 3)}%`
    : '—'
  const worstDay = slice.worstDay
    ? `${slice.worstDay.date} ${fmt(dayReturn(slice.worstDay), 3)}%`
    : '—'
  const bestTrade = slice.largestGain
    ? `${slice.largestGain.pair} ${fmt(slice.largestGain.returnPct, 2)}%`
    : '—'
  const worstTrade = slice.largestLoss
    ? `${slice.largestLoss.pair} ${fmt(slice.largestLoss.returnPct, 2)}%`
    : '—'
  const bestMonth = slice.bestMonth
    ? `${slice.bestMonth.label} ${fmt(slice.bestMonth.returnPct, 2)}%`
    : '—'
  const worstMonth = slice.worstMonth
    ? `${slice.worstMonth.label} ${fmt(slice.worstMonth.returnPct, 2)}%`
    : '—'

  const commonHead = [
    kpiCard(returnLabel, `${fmt(slice.simpleReturn, 2)}%`, 'pos', 'period-return'),
    kpiCard(daysLabel, String(slice.tradingDays), '', 'trading-days'),
    kpiCard('Total trades', String(slice.tradeCount), '', 'trade-count'),
    kpiCard('Winning %', `${fmt(winRate, 2)}%`, 'pos', 'win-rate'),
    kpiCard('Losing %', `${fmt(lossRate, 2)}%`, 'neg', 'loss-rate'),
  ]

  const middle =
    kind === 'daily'
      ? [
          kpiCard('Best trade', bestTrade, 'pos', 'best-trade'),
          kpiCard('Worst trade', worstTrade, 'neg', 'worst-trade'),
        ]
      : kind === 'weekly' || kind === 'monthly'
        ? [
            kpiCard('Best day', bestDay, 'pos', 'best-day'),
            kpiCard('Worst day', worstDay, 'neg', 'worst-day'),
          ]
        : [
            kpiCard('Best month', bestMonth, 'pos', 'best-month'),
            kpiCard('Worst month', worstMonth, 'neg', 'worst-month'),
          ]

  const tail = [
    kpiCard(profitLabel, `$${fmt(slice.profit, 2)}`, 'pos', 'profit'),
    kpiCard('Winning trades', String(slice.winTrades.length), 'pos', 'win-count'),
    kpiCard('Losing trades', String(slice.lossTrades.length), 'neg', 'loss-count'),
    kind === 'daily'
      ? kpiCard('Best day', bestDay, 'pos', 'best-day')
      : kind === 'quarterly' || kind === 'yearly'
        ? kpiCard('Best day', bestDay, 'pos', 'best-day')
        : kpiCard('Best trade', bestTrade, 'pos', 'best-trade'),
    kpiCard('Ending value ($100 basis)', `$${fmt(slice.ending, 2)}`, '', 'ending'),
  ]

  return [...commonHead, ...middle, ...tail].join('')
}

function archiveRefPanel() {
  return `<div class="panel" data-archive-reference="true">
  <h3>Full Archive Reference</h3>
  <p class="prose">These figures describe the complete 4-year ledger (${meta.startDate} → ${meta.endDate}), not this report’s selected period.</p>
  <div class="cards">
    ${kpiCard('Full Archive Best Day', `${stats.bestDay.date} (+${fmt(stats.bestDay.returnPct, 3)}%)`, 'pos', 'archive-best-day')}
    ${kpiCard('Full Archive Best Month', `${archiveBestMonth.label} ${fmt(archiveBestMonth.returnPct, 2)}%`, 'pos', 'archive-best-month')}
    ${kpiCard('Full Archive Worst Month', `${archiveWorstMonth.label} ${fmt(archiveWorstMonth.returnPct, 2)}%`, 'neg', 'archive-worst-month')}
    ${kpiCard('Full Archive Total Return', `${fmt(meta.totalReturnPct, 1)}%`, 'pos', 'archive-total-return')}
    ${kpiCard('Full Archive Ending Equity', `$${fmt(meta.endingEquity, 1)}`, '', 'archive-ending')}
    ${kpiCard('Full Archive Trading Days', String(stats.tradingDayCount), '', 'archive-trading-days')}
  </div>
</div>`
}

function execSummary(kind, slice, extraNote = '') {
  const cards = kind === 'archive' ? archiveKpiCards() : periodKpiCards(kind, slice)
  const curve = kind === 'archive' ? charts.equityCurve : slice.equityCurve
  const ref = kind === 'archive' ? '' : archiveRefPanel()
  return `<h2>Executive Summary</h2>
<p class="prose"><strong>Portfolio summary.</strong> ${extraNote || 'Derived from the published 4-year demo/backtest programme.'}</p>
<div class="cards" data-kpi-grid="${kind}">
  ${cards}
</div>
${ref}
<div class="panel"><h3>Growth of $100 · ${kind === 'archive' ? 'Performance overview' : 'Selected period (original $100 basis)'}</h3>${svgEquity(curve, `eqg-${kind}`)}</div>`
}

function chartsPage(kind, slice) {
  const barRows =
    kind === 'daily' || kind === 'weekly' || (kind === 'monthly' && slice.months.length <= 1)
      ? slice.days.map((d) => ({ returnPct: dayReturn(d) }))
      : slice.months
  const barTitle =
    kind === 'daily' || kind === 'weekly' || (kind === 'monthly' && slice.months.length <= 1)
      ? 'Daily return bars'
      : 'Monthly return bars'
  const yearlyTitle = slice.years.length > 1 ? 'Yearly performance' : 'Period return'
  const curve = kind === 'archive' ? charts.equityCurve : slice.equityCurve
  return `<h2>Performance Charts</h2>
<div class="panel"><h3>Equity curve</h3>${svgEquity(curve, `eqg2-${kind}`)}</div>
<div class="panel"><h3>${barTitle}</h3>${svgMonthlyBars(barRows)}</div>
<div class="grid-2">
  <div class="panel"><h3>${yearlyTitle}</h3>${svgYearly(slice)}</div>
  <div class="panel"><h3>Winning vs losing trades</h3>${svgWinLoss(slice.winTrades.length, slice.lossTrades.length)}</div>
</div>
<div class="panel"><h3>Drawdown curve</h3>${svgDrawdown(curve)}</div>
<div class="panel"><h3>Asset allocation (by trade count)</h3>${svgAllocation(slice.trades)}</div>
<div class="panel"><h3>Monthly heatmap</h3>${heatmap(slice)}</div>`
}

function commentary(kind, slice, periodLabel) {
  const dayWin = slice.dayWinRate
  const bestD = slice.bestDay
    ? `${slice.bestDay.date} (${fmt(dayReturn(slice.bestDay), 3)}%)`
    : 'n/a'
  const worstD = slice.worstDay
    ? `${slice.worstDay.date} (${fmt(dayReturn(slice.worstDay), 3)}%)`
    : 'n/a'
  const monthNote = slice.bestMonth
    ? `Best month in this period ${slice.bestMonth.label} at ${fmt(slice.bestMonth.returnPct, 2)}%. Softest month ${slice.worstMonth.label} at ${fmt(slice.worstMonth.returnPct, 2)}%.`
    : `Best day in this period ${bestD}. Softest day ${worstD}.`
  const avgNote =
    slice.avgMonthly != null
      ? `Average monthly simple return in this period ${fmt(slice.avgMonthly, 2)}%.`
      : ''
  const breakdownTitle =
    kind === 'quarterly' || kind === 'yearly' || kind === 'archive'
      ? kind === 'archive'
        ? 'Yearly summary'
        : 'Monthly breakdown'
      : 'Daily breakdown'
  const breakdown =
    kind === 'archive'
      ? `<table class="data"><thead><tr><th>Year</th><th>Return</th><th>Months</th></tr></thead><tbody>
${years.map((y) => `<tr><td>${y}</td><td class="pct">${fmt(simpleSum(byYear[y]), 2)}%</td><td>${byYear[y].length}</td></tr>`).join('')}
</tbody></table>`
      : kind === 'quarterly' || kind === 'yearly'
        ? monthlyTable(slice)
        : dailyTable(slice)
  return `<h2>Market Commentary & Highlights</h2>
<div class="panel prose">
  <p><strong>${periodLabel} programme notes.</strong> This pack covers ${slice.start} → ${slice.end}: ${slice.tradingDays} published trading days and ${slice.tradeCount} closed tickets. Positive-day share is approximately ${fmt(dayWin, 1)}%. Period simple return ${fmt(slice.simpleReturn, 2)}% on the original $100 book (profit $${fmt(slice.profit, 2)}).</p>
  <p><strong>Period highlights.</strong> ${monthNote} ${avgNote}</p>
  <p><strong>Risk metrics.</strong> Best day ${bestD}. Worst day ${worstD}. Trade win rate ${fmt(slice.tradeWinRate, 2)}% (${slice.winTrades.length} wins / ${slice.lossTrades.length} losses). Ending value on original $100 basis: $${fmt(slice.ending, 2)}.</p>
  <p><strong>Performance notes.</strong> Figures use simple (non-compounded) returns from the public demo ledger. Each day’s profit is original principal × that day’s return. Period profit is the sum of those daily profits. Labels mark this pack as backtest / educational presentation data.</p>
</div>
<div class="panel"><h3>${breakdownTitle}</h3>
${breakdown}</div>`
}

function tradesPage(slice) {
  const sampleN = Math.min(24, Math.max(slice.trades.length, 0))
  return `<h2>Trade Statistics</h2>
<div class="cards">
  <div class="card" data-kpi="sample-size"><span>Sample size (table)</span><strong>${sampleN || 0} of ${slice.tradeCount}</strong></div>
  <div class="card" data-kpi="table-wins"><span>Wins</span><strong class="pos">${slice.winTrades.length}</strong></div>
  <div class="card" data-kpi="table-losses"><span>Losses</span><strong class="neg">${slice.lossTrades.length}</strong></div>
  <div class="card" data-kpi="table-win-rate"><span>Win rate</span><strong>${fmt(slice.tradeWinRate, 2)}%</strong></div>
</div>
<div class="panel" style="overflow:auto;max-height:70vh">
<table class="data"><thead><tr><th></th><th>Date</th><th>Pair</th><th>Side</th><th>Entry</th><th>Exit</th><th>Return</th><th>Status</th></tr></thead>
<tbody>${tradeSample(slice.trades, 24)}</tbody></table>
<p class="prose" style="margin-top:12px">Full blotter: download trades.csv from the Historical Performance archive.</p>
</div>`
}

function closingPages(rid, slice) {
  return [
    `<h2>Methodology</h2>
<div class="panel prose">
  <p>Returns are simple (non-compounded) from published daily settlements in the demo/backtest ledger. Each daily and monthly profit is applied to the original principal. Trade tickets are closed desk records with pair, direction, entry, exit and return percentage.</p>
  <p>Growth of $100 starts at ${PRINCIPAL} and accumulates simple daily profit from the selected period only. Period ending value = original $100 + sum of daily profits in ${slice.start} → ${slice.end}.</p>
  <p><strong>Report ID:</strong> ${rid}<br/><strong>Generated at:</strong> ${generatedAt}<br/><strong>Version:</strong> ${version}<br/><strong>Period:</strong> ${slice.start} → ${slice.end}</p>
</div>
<h2>Disclaimer</h2>
<div class="panel prose">
  <p>This document is a <strong>synthetic demo / backtest presentation</strong>. It is not verified live trading history and must not be treated as a promise of future performance. Forex trading involves substantial risk of loss.</p>
  <p>© Wealthora Capital · Confidential · For educational / product-demo use.</p>
</div>`,
  ]
}

function sliceAttrs(kind, slice) {
  return {
    kind,
    'period-start': slice.start,
    'period-end': slice.end,
    'trading-days': slice.tradingDays,
    'trade-count': slice.tradeCount,
    'simple-return': fmt(slice.simpleReturn, 2),
    profit: fmt(slice.profit, 2),
    ending: fmt(slice.ending, 2),
    'win-count': slice.winTrades.length,
    'loss-count': slice.lossTrades.length,
    'win-rate': fmt(slice.tradeWinRate, 2),
    archive: kind === 'archive' ? '1' : '0',
    seed: ARCHIVE_SEED,
  }
}

function buildReport({ key, title, periodLabel, period, kind, slice, focusHtml }) {
  const rid = reportId(key)
  const pages = [
    cover({ title, periodLabel, period, rid }),
    execSummary(kind, slice, focusHtml),
    chartsPage(kind, slice),
    commentary(kind, slice, periodLabel),
    tradesPage(slice),
    ...closingPages(rid, slice),
  ]
  return {
    html: shell(title, rid, period, pages, sliceAttrs(kind, slice)),
    rid,
    pages: pages.length,
  }
}

const dailySlice = slices.daily
const weeklySlice = slices.weekly
const monthlySlice = slices.monthly
const quarterlySlice = slices.quarterly
const yearlySlice = slices.yearly
const archiveSlice = slices.archive

const reports = {
  'daily-report.html': buildReport({
    key: 'daily',
    title: 'Historical Performance Report',
    periodLabel: 'Daily desk summary',
    period: lastTradingDay,
    kind: 'daily',
    slice: dailySlice,
    focusHtml: `Selected trading day ${lastTradingDay}: ${fmt(dailySlice.simpleReturn, 2)}% across ${dailySlice.tradingDays} trading day.`,
  }),
  'weekly-report.html': buildReport({
    key: 'weekly',
    title: 'Historical Performance Report',
    periodLabel: 'Weekly performance pack',
    period: `${weeklySlice.start} → ${weeklySlice.end}`,
    kind: 'weekly',
    slice: weeklySlice,
    focusHtml: `Selected week ${weeklySlice.start} → ${weeklySlice.end}: ${fmt(weeklySlice.simpleReturn, 2)}% across ${weeklySlice.tradingDays} trading days.`,
  }),
  'monthly-report.html': buildReport({
    key: 'monthly',
    title: 'Historical Performance Report',
    periodLabel: 'Monthly',
    period: latestMonth.label,
    kind: 'monthly',
    slice: monthlySlice,
    focusHtml: `Focus month ${latestMonth.label}: ${fmt(latestMonth.returnPct, 2)}% across ${latestMonth.tradingDays} trading days.`,
  }),
  'quarterly-report.html': buildReport({
    key: 'quarterly',
    title: 'Historical Performance Report',
    periodLabel: 'Quarterly',
    period: `Q${q} ${latestMonth.year}`,
    kind: 'quarterly',
    slice: quarterlySlice,
    focusHtml: `Quarter Q${q} ${latestMonth.year} simple return ${fmt(simpleSum(qMonths), 2)}%.`,
  }),
  'yearly-report.html': buildReport({
    key: 'yearly',
    title: 'Historical Performance Report',
    periodLabel: 'Annual',
    period: String(latestYear),
    kind: 'yearly',
    slice: yearlySlice,
    focusHtml: `Annual focus ${latestYear}: simple return ${fmt(simpleSum(byYear[latestYear]), 2)}%.`,
  }),
  'complete-3year-report.html': buildReport({
    key: 'complete',
    title: 'Historical Performance Report',
    periodLabel: 'Complete 4-Year Archive',
    period: `${meta.startDate} → ${meta.endDate}`,
    kind: 'archive',
    slice: archiveSlice,
    focusHtml: `Full archive: ${fmt(meta.totalReturnPct, 1)}% total return, ending equity ${fmt(meta.endingEquity, 2)}.`,
  }),
  'performance-summary.html': buildReport({
    key: 'summary',
    title: 'Performance Summary',
    periodLabel: 'Executive summary pack',
    period: `${meta.startDate} → ${meta.endDate}`,
    kind: 'archive',
    slice: archiveSlice,
    focusHtml: 'Headline KPIs for investor walkthroughs.',
  }),
  'all-trades.html': buildReport({
    key: 'trades',
    title: 'Trade Blotter Report',
    periodLabel: 'All trades (summary view)',
    period: `${meta.startDate} → ${meta.endDate}`,
    kind: 'archive',
    slice: archiveSlice,
    focusHtml: `Closed tickets in archive: ${stats.tradeCount}. Table shows newest sample; CSV contains the full blotter.`,
  }),
  'backtest-summary.html': buildReport({
    key: 'backtest',
    title: '4-Year Backtest Summary',
    periodLabel: 'Programme summary',
    period: `${meta.startDate} → ${meta.endDate}`,
    kind: 'archive',
    slice: archiveSlice,
    focusHtml: 'Primary walkthrough summary for the Historical Performance Center.',
  }),
}

for (const [name, { html }] of Object.entries(reports)) {
  fs.writeFileSync(path.join(dir, name), html)
}

/** Render branded HTML → PDF via Chrome (presentation only; no data regen). */
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const chromeBin = chromeCandidates.find((p) => fs.existsSync(p))

function htmlToPdf(htmlName, pdfName) {
  if (!chromeBin) return false
  const htmlPath = path.join(dir, htmlName)
  const pdfPath = path.join(dir, pdfName)
  const fileUrl = pathToFileURL(htmlPath).href
  const result = spawnSync(
    chromeBin,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${pdfPath}`,
      fileUrl,
    ],
    { encoding: 'utf8', timeout: 120_000 },
  )
  return result.status === 0 && fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1000
}

const pdfTargets = [
  'daily-report',
  'weekly-report',
  'monthly-report',
  'quarterly-report',
  'yearly-report',
  'complete-3year-report',
  'performance-summary',
  'all-trades',
  'backtest-summary',
]

let pdfOk = 0
for (const name of pdfTargets) {
  if (htmlToPdf(`${name}.html`, `${name}.pdf`)) pdfOk += 1
}

if (pdfOk === 0) {
  // Fallback: keep prior binary so Download never 404s
  const summaryPdf = path.join(dir, 'backtest-summary.pdf')
  const exportPdf = path.resolve(
    __dirname,
    '../demo-data/3-year-backtest/export/reports/pdf/backtest-summary.pdf',
  )
  if (fs.existsSync(exportPdf)) fs.copyFileSync(exportPdf, summaryPdf)
  for (const name of pdfTargets) {
    if (name === 'backtest-summary') continue
    if (fs.existsSync(summaryPdf)) fs.copyFileSync(summaryPdf, path.join(dir, `${name}.pdf`))
  }
  console.warn('Chrome PDF export unavailable — fell back to existing summary PDF copies.')
} else {
  console.log(`Branded PDFs printed: ${pdfOk}/${pdfTargets.length}`)
}

const catalog = {
  generatedAt,
  seed: ARCHIVE_SEED,
  version,
  range: { startDate: meta.startDate, endDate: meta.endDate },
  disclaimer: 'Synthetic demo data for UI presentation only. Not live trading history.',
  reports: [
    {
      id: 'daily-pdf',
      title: 'Download Daily Reports',
      description: `Daily desk summary for ${lastTradingDay}`,
      format: 'pdf',
      href: '/demo/backtest/reports/daily-report.pdf',
      previewUrl: '/demo/backtest/reports/daily-report.html',
      fileName: 'daily-report.pdf',
      category: 'Daily',
    },
    {
      id: 'weekly-pdf',
      title: 'Download Weekly Reports',
      description: `Week ${weeklySlice.start} → ${weeklySlice.end}`,
      format: 'pdf',
      href: '/demo/backtest/reports/weekly-report.pdf',
      previewUrl: '/demo/backtest/reports/weekly-report.html',
      fileName: 'weekly-report.pdf',
      category: 'Weekly',
    },
    {
      id: 'monthly-pdf',
      title: 'Download Monthly Reports',
      description: `${latestMonth.label} simple return`,
      format: 'pdf',
      href: '/demo/backtest/reports/monthly-report.pdf',
      previewUrl: '/demo/backtest/reports/monthly-report.html',
      fileName: 'monthly-report.pdf',
      category: 'Monthly',
    },
    {
      id: 'quarterly-pdf',
      title: 'Download Quarterly Reports',
      description: `Q${q} ${latestMonth.year} simple return`,
      format: 'pdf',
      href: '/demo/backtest/reports/quarterly-report.pdf',
      previewUrl: '/demo/backtest/reports/quarterly-report.html',
      fileName: 'quarterly-report.pdf',
      category: 'Quarterly',
    },
    {
      id: 'yearly-pdf',
      title: 'Download Annual Reports',
      description: `${latestYear} simple return`,
      format: 'pdf',
      href: '/demo/backtest/reports/yearly-report.pdf',
      previewUrl: '/demo/backtest/reports/yearly-report.html',
      fileName: 'yearly-report.pdf',
      category: 'Yearly',
    },
    {
      id: 'complete-pdf',
      title: 'Download Complete 4-Year Report',
      description: 'Full programme summary',
      format: 'pdf',
      href: '/demo/backtest/reports/complete-3year-report.pdf',
      previewUrl: '/demo/backtest/reports/complete-3year-report.html',
      fileName: 'complete-3year-report.pdf',
      category: 'Yearly',
    },
    {
      id: 'trades-csv',
      title: 'Download CSV',
      description: 'Full trade blotter',
      format: 'csv',
      href: '/demo/backtest/trades.csv',
      previewUrl: '/demo/backtest/reports/all-trades.html',
      fileName: 'trades.csv',
      category: 'Other',
    },
    {
      id: 'trades-pdf',
      title: 'Download PDF',
      description: 'Trade blotter summary',
      format: 'pdf',
      href: '/demo/backtest/reports/all-trades.pdf',
      previewUrl: '/demo/backtest/reports/all-trades.html',
      fileName: 'all-trades.pdf',
      category: 'Other',
    },
    {
      id: 'summary-pdf',
      title: 'Download Performance Summary',
      description: 'Headline KPIs',
      format: 'pdf',
      href: '/demo/backtest/reports/performance-summary.pdf',
      previewUrl: '/demo/backtest/reports/performance-summary.html',
      fileName: 'performance-summary.pdf',
      category: 'Other',
    },
  ],
  previews: [
    {
      id: 'preview-monthly',
      title: 'Latest Monthly Report',
      href: '/demo/backtest/reports/monthly-report.html',
      download: '/demo/backtest/reports/monthly-report.pdf',
    },
    {
      id: 'preview-quarterly',
      title: 'Latest Quarterly Report',
      href: '/demo/backtest/reports/quarterly-report.html',
      download: '/demo/backtest/reports/quarterly-report.pdf',
    },
    {
      id: 'preview-yearly',
      title: 'Latest Yearly Report',
      href: '/demo/backtest/reports/yearly-report.html',
      download: '/demo/backtest/reports/yearly-report.pdf',
    },
  ],
}

fs.writeFileSync(path.join(root, 'report_catalog.json'), JSON.stringify(catalog, null, 2))
console.log('Branded HTML reports ready:', Object.keys(reports).length)
console.log(
  JSON.stringify(
    {
      daily: { start: dailySlice.start, days: dailySlice.tradingDays, ret: fmt(dailySlice.simpleReturn, 2) },
      weekly: { start: weeklySlice.start, end: weeklySlice.end, days: weeklySlice.tradingDays, ret: fmt(weeklySlice.simpleReturn, 2) },
      monthly: { start: monthlySlice.start, days: monthlySlice.tradingDays, ret: fmt(monthlySlice.simpleReturn, 2) },
      quarterly: { start: quarterlySlice.start, days: quarterlySlice.tradingDays, ret: fmt(quarterlySlice.simpleReturn, 2) },
      yearly: { start: yearlySlice.start, days: yearlySlice.tradingDays, ret: fmt(yearlySlice.simpleReturn, 2) },
      archive: { days: archiveSlice.tradingDays, ret: fmt(archiveSlice.simpleReturn, 2) },
    },
    null,
    2,
  ),
)
