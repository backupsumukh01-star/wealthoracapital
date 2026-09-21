import type { DisplayCurrency } from '@meridian/shared'

export type ProgressShareKind = 'journey' | 'daily'

export type ProgressShareChartPoint = {
  label: string
  value: string
}

/** Safe, shareable progress fields only — never include PII or internal IDs. */
export type ProgressShareSnapshot = {
  displayName: string
  displayCurrency: DisplayCurrency
  totalInvestment: string
  totalEarnings: string
  earningsTillDate: string
  currentValue: string
  performancePct: string
  todayEarnings: string
  dailyReturnPct: string
  asOfDate: string
  brandName: string
  /** Real equity reconstructions, thinned — never interpolated fakes. */
  portfolioHistory: ProgressShareChartPoint[]
  /** Real same-day distribution timestamps only; empty when unavailable. */
  intradayPerformance: ProgressShareChartPoint[]
}

export type ProgressShareLink = {
  token: string
  expiresAt: string
  shareUrl: string
  imageUrl: string
  journeyImageUrl: string
  dailyImageUrl: string
  journeyShareUrl: string
  dailyShareUrl: string
}
