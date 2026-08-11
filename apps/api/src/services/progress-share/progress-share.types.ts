import type { DisplayCurrency } from '@meridian/shared'

/** Safe, shareable progress fields only — never include PII or internal IDs. */
export type ProgressShareSnapshot = {
  displayName: string
  displayCurrency: DisplayCurrency
  /** Investment capital (USD ledger converted for display). */
  totalInvestment: string
  /** Lifetime investment earnings (same source as Earnings Till Date). */
  totalEarnings: string
  /** Alias for totalEarnings — matches Daily Profit email wording. */
  earningsTillDate: string
  /** Lifetime performance % from performanceService.summary. */
  performancePct: string
  asOfDate: string
  brandName: string
}

export type ProgressShareLink = {
  token: string
  expiresAt: string
  shareUrl: string
  imageUrl: string
}
