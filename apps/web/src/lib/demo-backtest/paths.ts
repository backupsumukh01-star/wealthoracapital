/** Public URL paths for Historical Performance Center demo JSON. */

export const DEMO_BACKTEST_BASE = '/demo/backtest' as const

export const DEMO_BACKTEST_FILES = {
  dashboardStats: `${DEMO_BACKTEST_BASE}/dashboard_stats.json`,
  charts: `${DEMO_BACKTEST_BASE}/charts.json`,
  dailyReturns: `${DEMO_BACKTEST_BASE}/daily_returns.json`,
  monthlyReturns: `${DEMO_BACKTEST_BASE}/monthly_returns.json`,
  trades: `${DEMO_BACKTEST_BASE}/trades.json`,
  /** Homepage blotter only — recent slice; full `trades` remains for HPC. */
  tradesPreview: `${DEMO_BACKTEST_BASE}/trades-preview.json`,
  reportCatalog: `${DEMO_BACKTEST_BASE}/report_catalog.json`,
} as const

export type DemoBacktestFileKey = keyof typeof DEMO_BACKTEST_FILES
