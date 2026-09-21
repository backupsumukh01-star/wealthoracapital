/**
 * Prototype-only share payload. Mirrors the eventual renderer contract.
 * Production image generation is unchanged and still lives in the API SVG renderer.
 */
export type ProgressShareKind = 'overall' | 'daily'

export type ProgressShareChartPoint = {
  label: string
  value: number
}

export type OverallShareInput = {
  type: 'overall'
  investorName: string
  totalInvestment: string
  totalEarnings: string
  currentValue: string
  performance: string
  date: string
  chartData: ProgressShareChartPoint[]
}

export type DailyShareInput = {
  type: 'daily'
  investorName: string
  todayEarnings: string
  dailyReturn: string
  totalEarnings: string
  date: string
  chartData: ProgressShareChartPoint[]
}

export type ProgressShareInput = OverallShareInput | DailyShareInput
