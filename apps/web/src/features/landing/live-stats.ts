/**
 * Landing-page live statistics helpers.
 * Prefer public performance API → demo/backtest JSON → current baseline.
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
  '78.6',
  '68',
  '42',
  '2.4',
  '2.7',
  '146',
  '0.70',
  '54.8',
])

/** Current programme baseline when APIs omit platform marketing counters. */
export const LANDING_BASELINE = {
  investors: 1786,
  aumMillions: 2.63,
  countries: 42,
  yearsOfPerformance: 3,
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
 * Single years-of-performance resolver used by KPI cards, CAGR, and summaries.
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

/** Compound $100 through monthly returns — shared by Growth of $100 table + summaries. */
export function buildGrowthOf100Rows(
  months: Array<{ month: string; returnPct: number; label?: string }>,
): Array<{
  month: string
  label: string
  returnPct: number
  portfolioValue: number
}> {
  let value = 100
  return months.map((m) => {
    value = value * (1 + m.returnPct / 100)
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
  const historyOk = metaHistoryUsable(meta)

  const trades =
    (meta?.tradeCount && meta.tradeCount > 0 ? meta.tradeCount : null) ??
    (pub?.analytics.closedTrades && pub.analytics.closedTrades > 0
      ? pub.analytics.closedTrades
      : null) ??
    (demo?.tradeCount && demo.tradeCount > 0 ? demo.tradeCount : null)

  const winRate =
    clean(meta?.winRatePct) ??
    clean(pub?.analytics.winRate) ??
    (demo ? fmt(demo.winRatePct, 1) : null) ??
    clean(cms?.winRate)

  const avgMonthly =
    (historyOk ? clean(meta?.avgMonthlyReturnPct) : null) ??
    (demo ? fmt(demo.avgMonthlyReturnPct, 1) : null) ??
    clean(cms?.avgMonthlyReturn)

  const bestDayRaw =
    (historyOk ? clean(meta?.bestDay?.returnPct) : null) ??
    clean(demo ? String(demo.bestDay.returnPct) : null) ??
    clean(pub?.analytics.bestTrade?.returnPct) ??
    clean(cms?.bestDay)

  const worstRaw =
    (historyOk ? clean(meta?.worstDay?.returnPct) : null) ??
    clean(demo ? String(demo.worstDay.returnPct) : null) ??
    clean(pub?.analytics.worstTrade?.returnPct)

  const totalReturn =
    (historyOk ? clean(meta?.totalReturnPct) : null) ??
    (demoMeta?.totalReturnPct != null ? fmt(demoMeta.totalReturnPct, 0) : null) ??
    (demo ? fmt(demo.totalReturnPct, 0) : null) ??
    clean(pub?.summary?.roiPct)

  const tradingDays = pickHistoryCount(meta?.tradingDayCount, demo?.tradingDayCount)

  const resolvedMonthCount =
    (historyOk && meta.monthCount > 0 ? meta.monthCount : null) ??
    (typeof monthCountHint === 'number' && monthCountHint > 0 ? monthCountHint : null) ??
    (demo?.monthCount && demo.monthCount > 0 ? demo.monthCount : null)

  const years = resolveYearsOfPerformance({
    startDate: meta?.startDate ?? demoMeta?.startDate,
    endDate: meta?.endDate ?? demoMeta?.endDate,
    monthCount: resolvedMonthCount,
    metaYears: meta?.yearsOfPerformance,
    tradingDayCount: tradingDays,
  })

  const distributedRaw = clean(pub?.analytics.totalPnl)
  const aum = pickMarketingValue(cms?.aum, LANDING_BASELINE.aumMillions)

  const cagr =
    (historyOk ? clean(meta?.cagrPct) : null) ??
    (demo && years
      ? fmt(
          (Math.pow(1 + Number(demo.totalReturnPct) / 100, 1 / Math.max(Number(years), 1 / 12)) -
            1) *
            100,
          1,
        )
      : null)

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
    totalDistributed: distributedRaw ? formatMoneyCompact(distributedRaw) : aum,
    totalDistributedRaw: distributedRaw ?? '',
    availableReports: reportCount,
    yearlyReturn: cagr ?? empty,
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
      value: stats.aumMillions,
      prefix: '$',
      suffix: 'M',
      decimals: 2,
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

/** Prefer published API monthly series when it has a full history; else demo/backtest. */
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

  // Never let a thin API sample (e.g. 1 month) hide the full 36+ month history.
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
        : 'Programme compound return',
      tradingDays: y.tradingDays,
      tradeCount: y.tradeCount,
      winRatePct: y.winRatePct,
    })) ?? []
  if (live.filter((y) => Math.abs(y.returnPct) > 0.0001).length >= 2) return live

  if (demoYearly?.length) {
    return demoYearly.map((y) => ({
      year: String(y.year),
      returnPct: Number(y.returnPct.toFixed(1)),
      profitLabel: 'Demo / backtest programme return',
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
        const factor = pcts.reduce((acc, r) => acc * (1 + r / 100), 1)
        return {
          year: String(year),
          returnPct: Number(((factor - 1) * 100).toFixed(1)),
          profitLabel: 'Demo / backtest programme return',
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
