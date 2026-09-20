/**
 * Landing-page live statistics helpers.
 *
 * Canonical public/demo performance (when the imported 4-year dataset is present)
 * takes precedence over GET /performance/public. That API is real/thin DailyReturn
 * history and must not mix 0.4%-scale figures into marketing pages.
 *
 * Never prefer known stale CMS marketing fixtures.
 * Never surface near-zero placeholders (0%, −0%, 1 day, 1 year) when richer history exists.
 */

import type { DemoDashboardStats, DemoMonthlyReturn, DemoYearlyReturn } from '@/lib/demo-backtest/types'
import type { PublicPerformancePayload } from '@/types/domain'

/** Known outdated CMS / mock fixtures — ignore these when a live source exists. */
export const STALE_MARKETING_VALUES = new Set([
  '4820',
  '18.4',
  '6.8',
  '7.3',
  '9.2',
  '0.4',
  '0.40',
  '132.9',
  '584',
  '78.6',
  '68',
  '42',
  '2.4',
  '2.7',
  '146',
  '0.70',
  '54.8',
  '469.8',
  '469.78',
  '451.8',
  '92576.98',
  '92676.98',
])

/** Current programme baseline when APIs omit platform marketing counters. */
export const LANDING_BASELINE = {
  investors: 1786,
  aumMillions: 2.63,
  countries: 42,
  yearsOfPerformance: 4,
} as const

/** Minimum trading days before API meta is trusted over the imported backtest. */
const MIN_TRUSTED_TRADING_DAYS = 30

export type LandingMonthlyPoint = {
  month: string
  returnPct: number
  label?: string
}

export type LandingLiveStats = {
  investors: string
  aumMillions: string
  countries: string
  avgMonthlyReturn: string
  winRate: string
  bestDay: string
  worstDayAbs: string
  totalReturn: string
  tradingDays: string
  trades: string
  yearsOfPerformance: string
  totalDistributed: string
  totalDistributedRaw: string
  availableReports: number
  yearlyReturn: string
  monthCount: string
}

function isNearZeroPlaceholder(s: string): boolean {
  const n = Number.parseFloat(s.replace(/%/g, ''))
  return Number.isFinite(n) && Math.abs(n) < 1e-9
}

function clean(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  if (isNearZeroPlaceholder(s)) return null
  if (STALE_MARKETING_VALUES.has(s)) return null
  return s
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

function formatMoneyCompact(raw: string | number | null | undefined): string {
  const n = Number.parseFloat(String(raw ?? '0'))
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 1_000_000) return fmt(n / 1_000_000, 2)
  if (n >= 1_000) return fmt(n / 1_000, 1)
  return fmt(n, 0)
}

function moneySuffix(raw: string | number | null | undefined): 'M' | 'K' | '' {
  const n = Number.parseFloat(String(raw ?? '0'))
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1_000_000) return 'M'
  if (n >= 1_000) return 'K'
  return ''
}

export function pickMarketingValue(
  cmsValue: string | null | undefined,
  fallback: string | number,
): string {
  return clean(cmsValue) ?? String(fallback)
}

export function elapsedYearsExact(startDate?: string | null, endDate?: string | null): number | null {
  if (!startDate || !endDate) return null
  const a = Date.parse(startDate)
  const b = Date.parse(endDate)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  return (b - a) / (365.25 * 24 * 60 * 60 * 1000)
}

export function simpleAnnualizedFromMonthlyAvg(avgMonthlyPct: number): number | null {
  if (!Number.isFinite(avgMonthlyPct)) return null
  return avgMonthlyPct * 12
}

/** Imported public demo is the marketing source of truth once it covers a full year. */
export function demoHistoryUsable(demo?: DemoDashboardStats | null): boolean {
  return Boolean(demo && demo.monthCount >= 12 && demo.tradingDayCount >= 30)
}

export function yearsFromRange(startDate?: string | null, endDate?: string | null): number | null {
  if (!startDate || !endDate) return null
  const a = Date.parse(startDate)
  const b = Date.parse(endDate)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  const years = (b - a) / (365.25 * 24 * 60 * 60 * 1000)
  if (years < 0.08) return null // reject sub-month spans that round to "1 year"
  return years >= 2.5 ? Math.round(years) : Number(years.toFixed(2))
}

/** Completed programme years from calendar-month count (37 → 3). */
export function yearsFromMonthCount(monthCount?: number | null): number | null {
  if (monthCount == null || !Number.isFinite(monthCount) || monthCount <= 0) return null
  if (monthCount >= 12) return Math.max(1, Math.round(monthCount / 12))
  return Number((monthCount / 12).toFixed(2))
}

/**
 * Single years-of-performance resolver used by KPI cards and summaries.
 * Prefers real date span, then month count, then explicit meta — never invents 1/—.
 */
export function resolveYearsOfPerformance(input: {
  startDate?: string | null
  endDate?: string | null
  monthCount?: number | null
  metaYears?: number | null
  tradingDayCount?: number | null
}): number | null {
  const fromDates = yearsFromRange(input.startDate, input.endDate)
  if (fromDates != null) return fromDates

  const fromMonths = yearsFromMonthCount(input.monthCount)
  if (fromMonths != null) return fromMonths

  if (input.metaYears != null && Number.isFinite(input.metaYears) && input.metaYears >= 1) {
    return input.metaYears >= 2.5 ? Math.round(input.metaYears) : Number(input.metaYears.toFixed(2))
  }

  // ~252 trading days / year — last resort when only day count exists.
  const days = input.tradingDayCount
  if (days != null && days >= 252) return Math.max(1, Math.round(days / 252))

  return null
}

function metaHistoryUsable(
  meta: PublicPerformancePayload['meta'] | undefined,
): meta is NonNullable<PublicPerformancePayload['meta']> {
  if (!meta) return false
  return (meta.tradingDayCount ?? 0) >= MIN_TRUSTED_TRADING_DAYS
}

/** Prefer a full API history; fall back to demo when API meta is a thin stub. */
function pickHistoryCount(
  apiCount: number | null | undefined,
  demoCount: number | null | undefined,
): number | null {
  const api = typeof apiCount === 'number' && apiCount > 0 ? apiCount : null
  const demo = typeof demoCount === 'number' && demoCount > 0 ? demoCount : null
  if (api != null && api >= MIN_TRUSTED_TRADING_DAYS) return api
  if (demo != null && demo >= MIN_TRUSTED_TRADING_DAYS) return demo
  return api ?? demo
}

/** Simple $100 accumulation: principal + cumulative original-principal profit. */
export function buildGrowthOf100Rows(
  months: Array<{ month: string; returnPct: number; label?: string }>,
): Array<{
  month: string
  label: string
  returnPct: number
  portfolioValue: number
}> {
  const principal = 100
  let value = principal
  return months.map((m) => {
    value = value + principal * (m.returnPct / 100)
    return {
      month: m.month,
      label: m.label || m.month,
      returnPct: m.returnPct,
      portfolioValue: Number(value.toFixed(4)),
    }
  })
}

export function buildLandingLiveStats(input: {
  pub?: PublicPerformancePayload | null
  demo?: DemoDashboardStats | null
  demoMeta?: { startDate?: string; endDate?: string; totalReturnPct?: number } | null
  cms?: {
    investorCount?: string
    aum?: string
    countries?: string
    avgMonthlyReturn?: string
    winRate?: string
    bestDay?: string
  } | null
  reportCount?: number
  /** Monthly series length when API meta.monthCount is missing / thin. */
  monthCount?: number
}): LandingLiveStats {
  const { pub, demo, demoMeta, cms, reportCount = 0, monthCount: monthCountHint } = input
  const meta = pub?.meta
  const demoOk = demoHistoryUsable(demo)
  const historyOk = !demoOk && metaHistoryUsable(meta)

  const trades = demoOk
    ? demo!.tradeCount > 0
      ? demo!.tradeCount
      : null
    : ((meta?.tradeCount && meta.tradeCount > 0 ? meta.tradeCount : null) ??
      (pub?.analytics.closedTrades && pub.analytics.closedTrades > 0
        ? pub.analytics.closedTrades
        : null) ??
      (demo?.tradeCount && demo.tradeCount > 0 ? demo.tradeCount : null))

  const winRate = demoOk
    ? fmt(demo!.winRatePct, 1)
    : (clean(meta?.winRatePct) ??
      clean(pub?.analytics.winRate) ??
      (demo ? fmt(demo.winRatePct, 1) : null) ??
      clean(cms?.winRate))

  const avgMonthly = demoOk
    ? fmt(demo!.avgMonthlyReturnPct, 1)
    : ((historyOk ? clean(meta?.avgMonthlyReturnPct) : null) ??
      (demo ? fmt(demo.avgMonthlyReturnPct, 1) : null) ??
      clean(cms?.avgMonthlyReturn))

  const bestDayRaw = demoOk
    ? String(demo!.bestDay.returnPct)
    : ((historyOk ? clean(meta?.bestDay?.returnPct) : null) ??
      clean(demo ? String(demo.bestDay.returnPct) : null) ??
      clean(pub?.analytics.bestTrade?.returnPct) ??
      clean(cms?.bestDay))

  const worstRaw = demoOk
    ? String(demo!.worstDay.returnPct)
    : ((historyOk ? clean(meta?.worstDay?.returnPct) : null) ??
      clean(demo ? String(demo.worstDay.returnPct) : null) ??
      clean(pub?.analytics.worstTrade?.returnPct))

  const totalReturn = demoOk
    ? fmt(demo!.totalReturnPct, 0)
    : ((historyOk ? clean(meta?.totalReturnPct) : null) ??
      (demoMeta?.totalReturnPct != null ? fmt(demoMeta.totalReturnPct, 0) : null) ??
      (demo ? fmt(demo.totalReturnPct, 0) : null) ??
      clean(pub?.summary?.roiPct))

  const tradingDays = demoOk
    ? demo!.tradingDayCount
    : pickHistoryCount(meta?.tradingDayCount, demo?.tradingDayCount)

  const resolvedMonthCount = demoOk
    ? Math.max(demo!.monthCount, typeof monthCountHint === 'number' ? monthCountHint : 0)
    : ((historyOk && meta.monthCount > 0 ? meta.monthCount : null) ??
      (typeof monthCountHint === 'number' && monthCountHint > 0 ? monthCountHint : null) ??
      (demo?.monthCount && demo.monthCount > 0 ? demo.monthCount : null))

  const startDate = demoOk ? (demoMeta?.startDate ?? meta?.startDate) : (meta?.startDate ?? demoMeta?.startDate)
  const endDate = demoOk ? (demoMeta?.endDate ?? meta?.endDate) : (meta?.endDate ?? demoMeta?.endDate)

  const years = resolveYearsOfPerformance({
    startDate,
    endDate,
    monthCount: resolvedMonthCount,
    metaYears: demoOk ? null : meta?.yearsOfPerformance,
    tradingDayCount: tradingDays,
  })

  const distributedRaw = clean(pub?.analytics.totalPnl)
  const aum = pickMarketingValue(cms?.aum, LANDING_BASELINE.aumMillions)

  const simpleAnnualized =
    demoOk
      ? (demo!.simpleAnnualizedReturnPct ??
        simpleAnnualizedFromMonthlyAvg(demo!.avgMonthlyReturnPct))
      : null

  const yearlySimple = demoOk && simpleAnnualized != null ? fmt(simpleAnnualized, 1) : null

  const empty = '—'

  return {
    investors: pickMarketingValue(cms?.investorCount, LANDING_BASELINE.investors),
    aumMillions: aum,
    countries: pickMarketingValue(cms?.countries, LANDING_BASELINE.countries),
    avgMonthlyReturn: avgMonthly ?? empty,
    winRate: winRate ?? empty,
    bestDay: bestDayRaw
      ? String(Math.abs(Number.parseFloat(bestDayRaw) || 0).toFixed(1))
      : empty,
    worstDayAbs: worstRaw
      ? String(Math.abs(Number.parseFloat(worstRaw) || 0).toFixed(1))
      : empty,
    totalReturn: totalReturn ?? empty,
    tradingDays: tradingDays != null ? String(tradingDays) : empty,
    trades: trades != null ? String(trades) : empty,
    yearsOfPerformance: years != null ? String(years) : empty,
    totalDistributed: distributedRaw ? formatMoneyCompact(distributedRaw) : '',
    totalDistributedRaw: distributedRaw ?? '',
    availableReports: reportCount,
    yearlyReturn: yearlySimple ?? empty,
    monthCount: resolvedMonthCount != null ? String(resolvedMonthCount) : empty,
  }
}

export function distributedMoneyParts(stats: LandingLiveStats): {
  value: string
  prefix: string
  suffix: string
  decimals: number
} {
  if (!stats.totalDistributedRaw) {
    return {
      value: '0',
      prefix: '$',
      suffix: '',
      decimals: 0,
    }
  }
  const n = Number.parseFloat(stats.totalDistributedRaw)
  const suffix = moneySuffix(n)
  return {
    value: formatMoneyCompact(n),
    prefix: '$',
    suffix,
    decimals: suffix === 'M' ? 2 : suffix === 'K' ? 1 : 0,
  }
}

/** Prefer the canonical 4-year demo series whenever it is complete. */
export function resolveMonthlySeries(
  apiMonthly: Array<{ month: string; returnPct: string | number }> | null | undefined,
  demoMonthly: DemoMonthlyReturn[] | null | undefined,
): LandingMonthlyPoint[] {
  const live =
    apiMonthly?.map((m) => ({
      month: m.month,
      returnPct: Number.parseFloat(String(m.returnPct)) || 0,
    })) ?? []
  const liveUsable = live.filter((m) => Math.abs(m.returnPct) > 0.0001)
  const demo =
    demoMonthly?.map((m) => ({
      month: m.yearMonth,
      returnPct: m.returnPct,
      label: m.label,
    })) ?? []

  if (demo.length >= 12) return demo
  // Never let a thin API sample (e.g. 1 month) hide a longer demo history.
  if (liveUsable.length >= 12 || (liveUsable.length > 0 && liveUsable.length >= demo.length)) {
    return live
  }
  if (demo.length > 0) return demo
  return live
}

export function resolveYearlySeries(
  apiYearly: Array<{
    year: string
    returnPct: string | number
    profit?: string
    tradingDays?: number
    tradeCount?: number
    winRatePct?: string
  }> | null | undefined,
  demoYearly: DemoYearlyReturn[] | null | undefined,
  demoMonthly: DemoMonthlyReturn[] | null | undefined,
): Array<{
  year: string
  returnPct: number
  profitLabel: string
  tradingDays?: number
  tradeCount?: number
  winRatePct?: string
}> {
  const live =
    apiYearly?.map((y) => ({
      year: String(y.year),
      returnPct: Number.parseFloat(String(y.returnPct)) || 0,
      profitLabel: y.profit
        ? `$${Number(y.profit).toLocaleString('en-US', { maximumFractionDigits: 0 })} distributed`
        : 'Programme simple return',
      tradingDays: y.tradingDays,
      tradeCount: y.tradeCount,
      winRatePct: y.winRatePct,
    })) ?? []

  const demoHasHistory = (demoMonthly?.length ?? 0) >= 12 || (demoYearly?.length ?? 0) >= 3

  if (!demoHasHistory && live.filter((y) => Math.abs(y.returnPct) > 0.0001).length >= 2) return live

  if (demoYearly?.length) {
    return demoYearly.map((y) => ({
      year: String(y.year),
      returnPct: Number(y.returnPct.toFixed(1)),
      profitLabel: '',
    }))
  }

  if (demoMonthly?.length) {
    const byYear = new Map<number, number[]>()
    for (const m of demoMonthly) {
      const list = byYear.get(m.year) ?? []
      list.push(m.returnPct)
      byYear.set(m.year, list)
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, pcts]) => {
        const sum = pcts.reduce((acc, r) => acc + r, 0)
        return {
          year: String(year),
          returnPct: Number(sum.toFixed(1)),
          profitLabel: '',
        }
      })
  }

  return live
}

export const DOWNLOAD_PERIODS = [
  'Daily Reports',
  'Weekly Reports',
  'Monthly Reports',
  'Quarterly Reports',
  'Yearly Reports',
] as const

export type DownloadPeriod = (typeof DOWNLOAD_PERIODS)[number]

export function normalizeDownloadPeriod(category: string): DownloadPeriod | 'Other' {
  const c = category.trim().toLowerCase()
  if (c.includes('daily') || c === 'day') return 'Daily Reports'
  if (c.includes('week')) return 'Weekly Reports'
  if (c.includes('month')) return 'Monthly Reports'
  if (c.includes('quarter')) return 'Quarterly Reports'
  if (c.includes('year') || c.includes('annual')) return 'Yearly Reports'
  return 'Other'
}
