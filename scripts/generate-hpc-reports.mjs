#!/usr/bin/env node
/**
 * Build institutional Wealthora-branded HTML performance reports from existing
 * demo/backtest JSON (does not regenerate trade/backtest data).
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
const meta = charts.meta
const generatedAt = new Date().toISOString()
const version = '2.0.0'

function compound(arr) {
  return (arr.reduce((a, r) => a * (1 + r.returnPct / 100), 1) - 1) * 100
}
function fmt(n, d = 2) {
  return Number(n).toFixed(d)
}
function reportId(key) {
  return `GZ-${createHash('sha1').update(`${key}-${meta.startDate}-${meta.endDate}-${version}`).digest('hex').slice(0, 10).toUpperCase()}`
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
const bestMonth = monthly.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
const worstMonth = monthly.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
const wins = trades.filter((t) => t.outcome === 'WIN' || t.returnPct > 0)
const losses = trades.filter((t) => t.outcome === 'LOSS' || t.returnPct < 0)
const largestGain = trades.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
const largestLoss = trades.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
const yearsSpan = Math.max(
  1 / 12,
  (Date.parse(meta.endDate) - Date.parse(meta.startDate)) / (365.25 * 86400000),
)
const cagr = (Math.pow(meta.endingEquity / meta.startingEquity, 1 / yearsSpan) - 1) * 100

// Equity downsample for SVG
const equity = charts.equityCurve || []
const eqStep = Math.max(1, Math.ceil(equity.length / 80))
const eqPts = equity.filter((_, i) => i % eqStep === 0 || i === equity.length - 1)

function svgEquity(gid = 'eqg') {
  const w = 640
  const h = 200
  const pad = 24
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
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.returnPct)), 1)
  const bw = (w - pad * 2) / rows.length
  const bars = rows
    .map((r, i) => {
      const mag = (Math.abs(r.returnPct) / maxAbs) * (h / 2 - 16)
      const x = pad + i * bw + 1
      const up = r.returnPct >= 0
      const y = up ? h / 2 - mag : h / 2
      return `<rect x="${x}" y="${y}" width="${Math.max(bw - 2, 1)}" height="${mag}" rx="2" fill="${up ? '#3CCB91' : '#E05C67'}"/>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Monthly returns"><line x1="${pad}" x2="${w - pad}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(255,255,255,0.15)"/><g>${bars}</g></svg>`
}

function svgYearly() {
  const rows = years.map((y) => ({ label: y, returnPct: compound(byYear[y]) }))
  return svgMonthlyBars(rows)
}

function svgDrawdown() {
  // Full curve first so daily dips are not lost to equity downsampling
  let peak = equity[0]?.equity ?? 100
  const full = equity.map((p) => {
    if (p.equity > peak) peak = p.equity
    return peak > 0 ? ((peak - p.equity) / peak) * 100 : 0
  })
  const step = Math.max(1, Math.ceil(full.length / 80))
  const dds = full.filter((_, i) => i % step === 0 || i === full.length - 1)
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

function svgWinLoss() {
  const w = 320
  const h = 160
  const total = Math.max(wins.length + losses.length, 1)
  const winW = (wins.length / total) * (w - 40)
  const lossW = (losses.length / total) * (w - 40)
  return `<svg viewBox="0 0 ${w} ${h}" class="chart chart-sm" role="img" aria-label="Winning vs losing"><rect x="20" y="50" width="${winW}" height="28" rx="6" fill="#3CCB91"/><rect x="${20 + winW}" y="50" width="${lossW}" height="28" rx="6" fill="#E05C67"/><text x="20" y="110" fill="#89939E" font-size="12">Wins ${wins.length} · Losses ${losses.length}</text></svg>`
}

function svgAllocation() {
  const counts = {}
  for (const t of trades) counts[t.pair] = (counts[t.pair] || 0) + 1
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
  const bars = rows
    .map(([pair, n], i) => {
      const y = 20 + i * (barH + gap)
      const bw = (n / total) * maxW
      const pct = ((n / total) * 100).toFixed(1)
      return `<text x="8" y="${y + 12}" fill="#89939E" font-size="11">${pair}</text><rect x="${left}" y="${y}" width="${bw}" height="${barH}" rx="4" fill="${colors[i % colors.length]}"/><text x="${left + bw + 8}" y="${y + 12}" fill="#F2F4F7" font-size="11">${pct}%</text>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Asset allocation">${bars}</svg>`
}

function heatmap() {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const cells = years
    .map((y) => {
      const row = months
        .map((_, mi) => {
          const m = monthly.find((x) => x.year === Number(y) && x.month === mi + 1)
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

function tradeSample(n = 24) {
  return [...trades]
    .slice(-n)
    .reverse()
    .map((t) => {
      const up = t.returnPct >= 0
      const icon = up ? '▲' : '▼'
      return `<tr class="${up ? 'win' : 'loss'}"><td class="icon">${icon}</td><td>${t.tradeDate}</td><td>${t.pair}</td><td>${t.direction}</td><td>${fmt(t.entryPrice, 5)}</td><td>${fmt(t.exitPrice, 5)}</td><td class="pct">${up ? '+' : ''}${fmt(t.returnPct, 3)}%</td><td>${t.status}</td></tr>`
    })
    .join('')
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

function shell(title, rid, period, pages) {
  const body = pages
    .map((html, i) => {
      return `<section class="report-page">${html}<div class="watermark">CONFIDENTIAL</div><footer class="footer"><span>Wealthora Capital · ${rid} · v${version}</span><span>Generated ${generatedAt.slice(0, 10)} · Page ${i + 1} of ${pages.length}</span></footer></section>`
    })
    .join('\n')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>${CSS}</style></head><body data-report-id="${rid}" data-period="${period}" data-version="${version}" data-generated="${generatedAt}">${body}</body></html>`
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

function execSummary(extraNote = '') {
  return `<h2>Executive Summary</h2>
<p class="prose"><strong>Portfolio summary.</strong> ${extraNote || 'Derived from the published 3-year demo/backtest programme.'}</p>
<div class="cards">
  <div class="card"><span>Avg monthly return</span><strong class="pos">${fmt(stats.avgMonthlyReturnPct, 2)}%</strong></div>
  <div class="card"><span>Total trading days</span><strong>${stats.tradingDayCount}</strong></div>
  <div class="card"><span>Total trades</span><strong>${stats.tradeCount}</strong></div>
  <div class="card"><span>Winning %</span><strong class="pos">${fmt(stats.winRatePct, 2)}%</strong></div>
  <div class="card"><span>Losing %</span><strong class="neg">${fmt(100 - stats.winRatePct, 2)}%</strong></div>
  <div class="card"><span>Best month</span><strong class="pos">${bestMonth.label} ${fmt(bestMonth.returnPct, 2)}%</strong></div>
  <div class="card"><span>Worst month</span><strong class="neg">${worstMonth.label} ${fmt(worstMonth.returnPct, 2)}%</strong></div>
  <div class="card"><span>Ending equity ($100)</span><strong>${fmt(meta.endingEquity, 1)}</strong></div>
  <div class="card"><span>Largest gain</span><strong class="pos">${largestGain.pair} ${fmt(largestGain.returnPct, 2)}%</strong></div>
  <div class="card"><span>Largest loss</span><strong class="neg">${largestLoss.pair} ${fmt(largestLoss.returnPct, 2)}%</strong></div>
  <div class="card"><span>Total return</span><strong class="pos">${fmt(meta.totalReturnPct, 1)}%</strong></div>
  <div class="card"><span>CAGR</span><strong>${fmt(cagr, 2)}%</strong></div>
</div>
<div class="panel"><h3>Growth of $100 · Performance overview</h3>${svgEquity('eqg1')}</div>`
}

function chartsPage() {
  return `<h2>Performance Charts</h2>
<div class="panel"><h3>Equity curve</h3>${svgEquity('eqg2')}</div>
<div class="panel"><h3>Monthly return bars</h3>${svgMonthlyBars(monthly)}</div>
<div class="grid-2">
  <div class="panel"><h3>Yearly performance</h3>${svgYearly()}</div>
  <div class="panel"><h3>Winning vs losing trades</h3>${svgWinLoss()}</div>
</div>
<div class="panel"><h3>Drawdown curve</h3>${svgDrawdown()}</div>
<div class="panel"><h3>Asset allocation (by trade count)</h3>${svgAllocation()}</div>
<div class="panel"><h3>Monthly heatmap</h3>${heatmap()}</div>`
}

function commentary(kind) {
  return `<h2>Market Commentary & Highlights</h2>
<div class="panel prose">
  <p><strong>${kind} programme notes.</strong> Desk activity across ${meta.startDate} → ${meta.endDate} shows ${stats.tradingDayCount} published trading days and ${stats.tradeCount} closed tickets. Positive-day share is approximately ${fmt(stats.positiveDayPct, 1)}%.</p>
  <p><strong>Monthly highlights.</strong> Best month ${bestMonth.label} at ${fmt(bestMonth.returnPct, 2)}%. Softest month ${worstMonth.label} at ${fmt(worstMonth.returnPct, 2)}%. Average monthly compound ${fmt(stats.avgMonthlyReturnPct, 2)}%.</p>
  <p><strong>Risk metrics.</strong> Max observed day ${fmt(stats.bestDay.returnPct, 3)}% / ${fmt(stats.worstDay.returnPct, 3)}%. Win rate ${fmt(stats.winRatePct, 2)}%. CAGR ~${fmt(cagr, 2)}% on a $100 normalised book.</p>
  <p><strong>Performance notes.</strong> Figures are compounded from the public demo ledger. Labels mark this pack as backtest / educational presentation data.</p>
</div>
<div class="panel"><h3>Yearly summary</h3>
<table class="data"><thead><tr><th>Year</th><th>Return</th><th>Months</th></tr></thead><tbody>
${years.map((y) => `<tr><td>${y}</td><td class="pct">${fmt(compound(byYear[y]), 2)}%</td><td>${byYear[y].length}</td></tr>`).join('')}
</tbody></table></div>`
}

function tradesPage() {
  return `<h2>Trade Statistics</h2>
<div class="cards">
  <div class="card"><span>Sample size (table)</span><strong>24 newest</strong></div>
  <div class="card"><span>Wins</span><strong class="pos">${wins.length}</strong></div>
  <div class="card"><span>Losses</span><strong class="neg">${losses.length}</strong></div>
  <div class="card"><span>Win rate</span><strong>${fmt(stats.winRatePct, 2)}%</strong></div>
</div>
<div class="panel" style="overflow:auto;max-height:70vh">
<table class="data"><thead><tr><th></th><th>Date</th><th>Pair</th><th>Side</th><th>Entry</th><th>Exit</th><th>Return</th><th>Status</th></tr></thead>
<tbody>${tradeSample(24)}</tbody></table>
<p class="prose" style="margin-top:12px">Full blotter: download trades.csv from the Historical Performance archive.</p>
</div>`
}

function closingPages(rid) {
  return [
    `<h2>Methodology</h2>
<div class="panel prose">
  <p>Returns are compounded from published daily settlements in the demo/backtest ledger. Trade tickets are closed desk records with pair, direction, entry, exit, and return percentage.</p>
  <p>Growth of $100 starts at ${meta.startingEquity} and compounds month-by-month from the same history investors can inspect on the website.</p>
  <p><strong>Report ID:</strong> ${rid}<br/><strong>Generated at:</strong> ${generatedAt}<br/><strong>Version:</strong> ${version}<br/><strong>Period:</strong> ${meta.startDate} → ${meta.endDate}</p>
</div>
<h2>Disclaimer</h2>
<div class="panel prose">
  <p>This document is a <strong>synthetic demo / backtest presentation</strong>. It is not verified live trading history and must not be treated as a promise of future performance. Forex trading involves substantial risk of loss.</p>
  <p>© Wealthora Capital · Confidential · For educational / product-demo use.</p>
</div>`,
  ]
}

function buildReport({ key, title, periodLabel, period, focusHtml }) {
  const rid = reportId(key)
  const pages = [
    cover({ title, periodLabel, period, rid }),
    execSummary(focusHtml),
    chartsPage(),
    commentary(periodLabel),
    tradesPage(),
    ...closingPages(rid),
  ]
  return { html: shell(title, rid, period, pages), rid, pages: pages.length }
}

const reports = {
  'daily-report.html': buildReport({
    key: 'daily',
    title: 'Historical Performance Report',
    periodLabel: 'Daily desk summary',
    period: `${meta.endDate} (programme window ${meta.startDate} → ${meta.endDate})`,
    focusHtml: `Latest daily context inside the full ${stats.tradingDayCount}-day archive. Best day ${stats.bestDay.date} (${fmt(stats.bestDay.returnPct, 3)}%), worst ${stats.worstDay.date} (${fmt(stats.worstDay.returnPct, 3)}%).`,
  }),
  'weekly-report.html': buildReport({
    key: 'weekly',
    title: 'Historical Performance Report',
    periodLabel: 'Weekly performance pack',
    period: `${meta.startDate} → ${meta.endDate}`,
    focusHtml: 'Rolling weekly-style programme pack over the published multi-year ledger.',
  }),
  'monthly-report.html': buildReport({
    key: 'monthly',
    title: 'Historical Performance Report',
    periodLabel: 'Monthly',
    period: latestMonth.label,
    focusHtml: `Focus month ${latestMonth.label}: ${fmt(latestMonth.returnPct, 2)}% across ${latestMonth.tradingDays} trading days.`,
  }),
  'quarterly-report.html': buildReport({
    key: 'quarterly',
    title: 'Historical Performance Report',
    periodLabel: 'Quarterly',
    period: `Q${q} ${latestMonth.year}`,
    focusHtml: `Quarter Q${q} ${latestMonth.year} compound ${fmt(compound(qMonths), 2)}%.`,
  }),
  'yearly-report.html': buildReport({
    key: 'yearly',
    title: 'Historical Performance Report',
    periodLabel: 'Annual',
    period: String(latestYear),
    focusHtml: `Annual focus ${latestYear}: compound ${fmt(compound(byYear[latestYear]), 2)}%.`,
  }),
  'complete-3year-report.html': buildReport({
    key: 'complete',
    title: 'Historical Performance Report',
    periodLabel: 'Complete 3-Year Archive',
    period: `${meta.startDate} → ${meta.endDate}`,
    focusHtml: `Full archive: ${fmt(meta.totalReturnPct, 1)}% total return, ending equity ${fmt(meta.endingEquity, 2)}.`,
  }),
  'performance-summary.html': buildReport({
    key: 'summary',
    title: 'Performance Summary',
    periodLabel: 'Executive summary pack',
    period: `${meta.startDate} → ${meta.endDate}`,
    focusHtml: 'Headline KPIs for investor walkthroughs.',
  }),
  'all-trades.html': buildReport({
    key: 'trades',
    title: 'Trade Blotter Report',
    periodLabel: 'All trades (summary view)',
    period: `${meta.startDate} → ${meta.endDate}`,
    focusHtml: `Closed tickets in archive: ${stats.tradeCount}. Table shows newest sample; CSV contains the full blotter.`,
  }),
  'backtest-summary.html': buildReport({
    key: 'backtest',
    title: '3-Year Backtest Summary',
    periodLabel: 'Programme summary',
    period: `${meta.startDate} → ${meta.endDate}`,
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
  seed: 'growzy-3y-backtest-v1',
  version,
  range: { startDate: meta.startDate, endDate: meta.endDate },
  disclaimer: 'Synthetic demo data for UI presentation only. Not live trading history.',
  reports: [
    {
      id: 'daily-pdf',
      title: 'Download Daily Reports',
      description: 'Daily desk summary pack',
      format: 'pdf',
      href: '/demo/backtest/reports/daily-report.pdf',
      previewUrl: '/demo/backtest/reports/daily-report.html',
      fileName: 'daily-report.pdf',
      category: 'Daily',
    },
    {
      id: 'weekly-pdf',
      title: 'Download Weekly Reports',
      description: 'Weekly performance pack',
      format: 'pdf',
      href: '/demo/backtest/reports/weekly-report.pdf',
      previewUrl: '/demo/backtest/reports/weekly-report.html',
      fileName: 'weekly-report.pdf',
      category: 'Weekly',
    },
    {
      id: 'monthly-pdf',
      title: 'Download Monthly Reports',
      description: 'Latest month compound return',
      format: 'pdf',
      href: '/demo/backtest/reports/monthly-report.pdf',
      previewUrl: '/demo/backtest/reports/monthly-report.html',
      fileName: 'monthly-report.pdf',
      category: 'Monthly',
    },
    {
      id: 'quarterly-pdf',
      title: 'Download Quarterly Reports',
      description: 'Latest quarter compound return',
      format: 'pdf',
      href: '/demo/backtest/reports/quarterly-report.pdf',
      previewUrl: '/demo/backtest/reports/quarterly-report.html',
      fileName: 'quarterly-report.pdf',
      category: 'Quarterly',
    },
    {
      id: 'yearly-pdf',
      title: 'Download Annual Reports',
      description: 'Latest year compound return',
      format: 'pdf',
      href: '/demo/backtest/reports/yearly-report.pdf',
      previewUrl: '/demo/backtest/reports/yearly-report.html',
      fileName: 'yearly-report.pdf',
      category: 'Yearly',
    },
    {
      id: 'complete-pdf',
      title: 'Download Complete 3-Year Report',
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
