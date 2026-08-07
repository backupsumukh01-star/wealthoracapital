#!/usr/bin/env node
/** Generate HPC report HTML/PDF aliases + catalog into apps/web/public/demo/backtest */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../apps/web/public/demo/backtest')
const dir = path.join(root, 'reports')
fs.mkdirSync(dir, { recursive: true })

const stats = JSON.parse(fs.readFileSync(path.join(root, 'dashboard_stats.json'), 'utf8'))
const monthly = JSON.parse(fs.readFileSync(path.join(root, 'monthly_returns.json'), 'utf8'))
const charts = JSON.parse(fs.readFileSync(path.join(root, 'charts.json'), 'utf8'))
const meta = charts.meta

function report(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:880px;margin:40px auto;padding:0 16px;color:#0f172a;background:#f8fafc}h1{font-size:1.5rem}h2{font-size:1.15rem;margin-top:1.5rem}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left;font-size:14px}.note{color:#64748b;font-size:12px;margin-top:24px}</style></head>
<body><h1>${title}</h1><p class="note">Synthetic demo/backtest data for presentation only. Not live trading history.</p>${body}</body></html>`
}

function compound(arr) {
  return (arr.reduce((a, r) => a * (1 + r.returnPct / 100), 1) - 1) * 100
}

const latestMonth = monthly[monthly.length - 1]
const byYear = {}
for (const m of monthly) {
  ;(byYear[m.year] ||= []).push(m)
}
const years = Object.keys(byYear).sort()
const latestYear = years[years.length - 1]
const q = Math.floor((latestMonth.month - 1) / 3) + 1
const qMonths = monthly.filter(
  (m) => m.year === latestMonth.year && Math.floor((m.month - 1) / 3) + 1 === q,
)

const files = {
  'daily-report.html': report(
    'Latest Daily Performance Report',
    `<p>Window ${meta.startDate} → ${meta.endDate}</p><p>Trading days: ${stats.tradingDayCount}</p><p>Best day: ${stats.bestDay.date} (${stats.bestDay.returnPct.toFixed(3)}%)</p><p>Worst day: ${stats.worstDay.date} (${stats.worstDay.returnPct.toFixed(3)}%)</p>`,
  ),
  'weekly-report.html': report(
    'Latest Weekly Performance Report',
    `<p>Rolling desk summary from the 3-year demo backtest.</p><p>Win rate: ${stats.winRatePct.toFixed(2)}%</p><p>Avg monthly: ${stats.avgMonthlyReturnPct.toFixed(2)}%</p>`,
  ),
  'monthly-report.html': report(
    'Latest Monthly Performance Report',
    `<h2>${latestMonth.label}</h2><p>Return: ${latestMonth.returnPct.toFixed(2)}%</p><p>Trading days: ${latestMonth.tradingDays}</p><table><tr><th>Month</th><th>Return</th></tr>${monthly
      .slice(-6)
      .map((m) => `<tr><td>${m.label}</td><td>${m.returnPct.toFixed(2)}%</td></tr>`)
      .join('')}</table>`,
  ),
  'quarterly-report.html': report(
    'Latest Quarterly Performance Report',
    `<h2>Q${q} ${latestMonth.year}</h2><p>Compound return: ${compound(qMonths).toFixed(2)}%</p><table><tr><th>Month</th><th>Return</th></tr>${qMonths
      .map((m) => `<tr><td>${m.label}</td><td>${m.returnPct.toFixed(2)}%</td></tr>`)
      .join('')}</table>`,
  ),
  'yearly-report.html': report(
    'Latest Yearly Performance Report',
    `<h2>${latestYear}</h2><p>Compound return: ${compound(byYear[latestYear]).toFixed(2)}%</p><table><tr><th>Year</th><th>Return</th><th>Months</th></tr>${years
      .map(
        (y) =>
          `<tr><td>${y}</td><td>${compound(byYear[y]).toFixed(2)}%</td><td>${byYear[y].length}</td></tr>`,
      )
      .join('')}</table>`,
  ),
  'complete-3year-report.html': report(
    'Complete 3-Year Performance Report',
    `<p>Start equity: $${meta.startingEquity}</p><p>End equity: $${Number(meta.endingEquity).toFixed(2)}</p><p>Total return: ${Number(meta.totalReturnPct).toFixed(2)}%</p><p>Trades: ${stats.tradeCount}</p><p>Trading days: ${stats.tradingDayCount}</p>`,
  ),
  'performance-summary.html': report(
    'Performance Summary',
    `<p>Win rate ${stats.winRatePct.toFixed(2)}% · ${stats.tradeCount} trades · ${stats.tradingDayCount} days · avg monthly ${stats.avgMonthlyReturnPct.toFixed(2)}%</p>`,
  ),
  'all-trades.html': report(
    'All Trades Report',
    `<p>Full blotter for ${stats.tradeCount} closed demo trades.</p><p><a href="/demo/backtest/trades.csv">Download trades.csv</a></p>`,
  ),
}

for (const [name, html] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), html)
}

const summaryPdf = path.join(dir, 'backtest-summary.pdf')
const exportPdf = path.resolve(
  __dirname,
  '../demo-data/3-year-backtest/export/reports/pdf/backtest-summary.pdf',
)
if (fs.existsSync(exportPdf)) fs.copyFileSync(exportPdf, summaryPdf)

for (const name of [
  'daily-report',
  'weekly-report',
  'monthly-report',
  'quarterly-report',
  'yearly-report',
  'complete-3year-report',
  'performance-summary',
  'all-trades',
]) {
  if (fs.existsSync(summaryPdf)) {
    fs.copyFileSync(summaryPdf, path.join(dir, `${name}.pdf`))
  }
}

const exportCsv = path.resolve(__dirname, '../demo-data/3-year-backtest/export/csv')
for (const f of ['trades.csv', 'monthly_returns.csv', 'dashboard_stats.csv']) {
  const src = path.join(exportCsv, f)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, f))
}

const catalog = {
  generatedAt: new Date().toISOString(),
  seed: 'growzy-3y-backtest-v1',
  range: { startDate: meta.startDate, endDate: meta.endDate },
  disclaimer: 'Synthetic demo data for UI presentation only. Not live trading history.',
  reports: [
    {
      id: 'daily-pdf',
      title: 'Download Daily Report PDF',
      description: 'Latest daily desk summary',
      format: 'pdf',
      href: '/demo/backtest/reports/daily-report.pdf',
      fileName: 'daily-report.pdf',
      category: 'Daily',
    },
    {
      id: 'weekly-pdf',
      title: 'Download Weekly Report PDF',
      description: 'Weekly performance pack',
      format: 'pdf',
      href: '/demo/backtest/reports/weekly-report.pdf',
      fileName: 'weekly-report.pdf',
      category: 'Weekly',
    },
    {
      id: 'monthly-pdf',
      title: 'Download Monthly Report PDF',
      description: 'Latest month compound return',
      format: 'pdf',
      href: '/demo/backtest/reports/monthly-report.pdf',
      fileName: 'monthly-report.pdf',
      category: 'Monthly',
    },
    {
      id: 'quarterly-pdf',
      title: 'Download Quarterly Report PDF',
      description: 'Latest quarter compound return',
      format: 'pdf',
      href: '/demo/backtest/reports/quarterly-report.pdf',
      fileName: 'quarterly-report.pdf',
      category: 'Quarterly',
    },
    {
      id: 'yearly-pdf',
      title: 'Download Yearly Report PDF',
      description: 'Latest year compound return',
      format: 'pdf',
      href: '/demo/backtest/reports/yearly-report.pdf',
      fileName: 'yearly-report.pdf',
      category: 'Yearly',
    },
    {
      id: 'complete-pdf',
      title: 'Download Complete 3-Year Report',
      description: 'Full programme summary',
      format: 'pdf',
      href: '/demo/backtest/reports/complete-3year-report.pdf',
      fileName: 'complete-3year-report.pdf',
      category: 'Yearly',
    },
    {
      id: 'trades-csv',
      title: 'Download All Trades CSV',
      description: 'Full trade blotter',
      format: 'csv',
      href: '/demo/backtest/trades.csv',
      fileName: 'trades.csv',
      category: 'Other',
    },
    {
      id: 'trades-pdf',
      title: 'Download All Trades PDF',
      description: 'Trade blotter summary',
      format: 'pdf',
      href: '/demo/backtest/reports/all-trades.pdf',
      fileName: 'all-trades.pdf',
      category: 'Other',
    },
    {
      id: 'summary-pdf',
      title: 'Download Performance Summary',
      description: 'Headline KPIs',
      format: 'pdf',
      href: '/demo/backtest/reports/performance-summary.pdf',
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
console.log('HPC reports ready')
