import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  DemoChartsPayload,
  DemoDailyReturn,
  DemoDashboardStats,
  DemoMonthlyReturn,
  DemoReportCatalog,
  DemoTrade,
} from './types'

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'demo', 'backtest')

async function readJson<T>(fileName: string): Promise<T> {
  const raw = await readFile(path.join(PUBLIC_DIR, fileName), 'utf8')
  return JSON.parse(raw) as T
}

/** Server-only loaders for `/demo/backtest/*.json` (SSR / RSC). */
export async function loadDashboardStats() {
  return readJson<DemoDashboardStats>('dashboard_stats.json')
}

export async function loadCharts() {
  return readJson<DemoChartsPayload>('charts.json')
}

export async function loadMonthlyReturns() {
  return readJson<DemoMonthlyReturn[]>('monthly_returns.json')
}

export async function loadDailyReturns() {
  return readJson<DemoDailyReturn[]>('daily_returns.json')
}

export async function loadTrades() {
  return readJson<DemoTrade[]>('trades.json')
}

export async function loadReportCatalog() {
  return readJson<DemoReportCatalog>('report_catalog.json')
}

export async function loadDemoBacktestCore() {
  const [stats, charts, monthlyReturns, reportCatalog] = await Promise.all([
    loadDashboardStats(),
    loadCharts(),
    loadMonthlyReturns(),
    loadReportCatalog(),
  ])
  return { stats, charts, monthlyReturns, reportCatalog }
}
