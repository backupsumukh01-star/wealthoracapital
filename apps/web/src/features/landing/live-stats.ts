/**
 * Landing-page live statistics helpers.
 * Prefer public performance API → demo/backtest JSON → current baseline.
 * Never prefer known stale CMS marketing fixtures.
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

function clean(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || s === '0' || s === '0.00' || s === '0.000000') return null
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

export function yearsFromRange(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return LANDING_BASELINE.yearsOfPerformance
  const a = Date.parse(startDate)
  const b = Date.parse(endDate)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) {
    return LANDING_BASELINE.yearsOfPerformance
  }
  const years = (b - a) / (365.25 * 24 * 60 * 60 * 1000)
  return Math.max(1, Math.round(years))
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
}): LandingLiveStats {
  const { pub, demo, demoMeta, cms, reportCount = 0 } = input
  const meta = pub?.meta

  const trades =
    (meta?.tradeCount && meta.tradeCount > 0 ? meta.tradeCount : null) ??
    (pub?.analytics.closedTrades && pub.analytics.closedTrades > 0
      ? pub.analytics.closedTrades
      : null) ??
    demo?.tradeCount ??
    2786

  const winRate =
    clean(meta?.winRatePct) ??
    clean(pub?.analytics.winRate) ??
    clean(cms?.winRate) ??
    (demo ? fmt(demo.winRatePct, 1) : '79.5')

  const avgMonthly =
    clean(meta?.avgMonthlyReturnPct) ??
    clean(cms?.avgMonthlyReturn) ??
    (demo ? fmt(demo.avgMonthlyReturnPct, 1) : '7.3')

  const bestDay =
    clean(meta?.bestDay?.returnPct) ??
    clean(pub?.analytics.bestTrade?.returnPct) ??
    clean(cms?.bestDay) ??
    (demo ? fmt(demo.bestDay.returnPct, 1) : '3.7')

  const worstRaw =
    clean(meta?.worstDay?.returnPct) ??
    clean(pub?.analytics.worstTrade?.returnPct) ??
    (demo ? String(demo.worstDay.returnPct) : '-1.1')
  const worstDayAbs = String(Math.abs(Number.parseFloat(worstRaw) || 0).toFixed(1))

  const totalReturn =
    clean(meta?.totalReturnPct) ??
    (demoMeta?.totalReturnPct != null ? fmt(demoMeta.totalReturnPct, 0) : null) ??
    (demo ? fmt(demo.totalReturnPct, 0) : null) ??
    clean(pub?.summary?.roiPct) ??
    '1255'

  const tradingDays = meta?.tradingDayCount ?? demo?.tradingDayCount ?? 783
  const years =
    meta?.yearsOfPerformance != null
      ? Math.max(1, Math.round(meta.yearsOfPerformance))
      : yearsFromRange(
          meta?.startDate ?? demoMeta?.startDate,
          meta?.endDate ?? demoMeta?.endDate,
        )

  const distributedRaw = clean(pub?.analytics.totalPnl)
  const aum = pickMarketingValue(cms?.aum, LANDING_BASELINE.aumMillions)

  return {
    investors: pickMarketingValue(cms?.investorCount, LANDING_BASELINE.investors),
    aumMillions: aum,
    countries: pickMarketingValue(cms?.countries, LANDING_BASELINE.countries),
    avgMonthlyReturn: avgMonthly,
    winRate,
    bestDay: String(Math.abs(Number.parseFloat(bestDay) || 0).toFixed(1)),
    worstDayAbs,
    totalReturn,
    tradingDays: String(tradingDays),
    trades: String(trades),
    yearsOfPerformance: String(years),
    totalDistributed: distributedRaw ? formatMoneyCompact(distributedRaw) : aum,
    totalDistributedRaw: distributedRaw ?? '',
    availableReports: reportCount,
    yearlyReturn: meta?.cagrPct
      ? clean(meta.cagrPct) ?? meta.cagrPct
      : demo
        ? fmt(demo.totalReturnPct / Math.max(years, 1), 1)
        : '54.8',
    monthCount: String(meta?.monthCount ?? demo?.monthCount ?? 37),
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
