/** Types for the public Historical Performance Center demo/backtest JSON. */

export interface DemoBacktestDayStat {
  date: string
  returnPct: number
}

export interface DemoDashboardStats {
  tradingDayCount: number
  tradeCount: number
  winCount: number
  lossCount: number
  winRatePct: number
  positiveDayPct: number
  avgMonthlyReturnPct: number
  monthsInBand: number
  monthCount: number
  bestDay: DemoBacktestDayStat
  worstDay: DemoBacktestDayStat
  totalReturnPct: number
  endingEquity: number
}

export interface DemoMonthlyReturn {
  yearMonth: string
  year: number
  month: number
  label: string
  returnPct: number
  tradingDays: number
  inPresentationBand: boolean
}

export interface DemoYearlyReturn {
  year: number
  returnPct: number
}

export interface DemoEquityPoint {
  date: string
  equity: number
  returnPct: number
}

export interface DemoChartsPayload {
  meta: {
    startDate: string
    endDate: string
    startingEquity: number
    endingEquity: number
    totalReturnPct: number
  }
  equityCurve: DemoEquityPoint[]
  monthlyReturns: Array<{
    yearMonth: string
    label: string
    returnPct: number
    tradingDays: number
    inPresentationBand: boolean
  }>
  yearlyReturns: DemoYearlyReturn[]
}

export interface DemoDailyReturn {
  id: string
  date: string
  status: string
  computedReturnPct: number
  netReturnPct: number
  tradeCount: number
  winCount: number
  lossCount: number
  summary: string
  publishedAt: string
}

export interface DemoTrade {
  id: string
  reference: string
  tradeDate: string
  pair: string
  direction: 'BUY' | 'SELL' | string
  strategy: string
  risk: string
  lotSize: number
  entryPrice: number
  exitPrice: number
  stopLoss?: number
  takeProfit?: number
  openTime: string
  closeTime: string
  status: string
  outcome: 'WIN' | 'LOSS' | string
  returnPct: number
  pips: number
  isPublic: boolean
  profitAmount?: number | null
  lossAmount?: number | null
  tradingDayId?: string
}

export interface DemoReportCatalogItem {
  id: string
  title: string
  description: string
  format: 'html' | 'pdf' | 'csv' | string
  href: string
  fileName: string
  category?: string
}

export interface DemoReportPreview {
  id: string
  title: string
  href: string
  download: string
}

export interface DemoReportCatalog {
  generatedAt: string
  seed: string
  range: { startDate: string; endDate: string }
  disclaimer: string
  reports: DemoReportCatalogItem[]
  previews?: DemoReportPreview[]
}

export interface DemoBacktestBundle {
  stats: DemoDashboardStats
  charts: DemoChartsPayload
  monthlyReturns: DemoMonthlyReturn[]
  dailyReturns: DemoDailyReturn[]
  trades: DemoTrade[]
  reportCatalog: DemoReportCatalog
}
