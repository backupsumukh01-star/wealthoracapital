import { describe, expect, it } from 'vitest'

import type { DemoDashboardStats, DemoMonthlyReturn } from '@/lib/demo-backtest/types'

import {
  buildGrowthOf100Rows,
  buildLandingLiveStats,
  demoHistoryUsable,
  resolveMonthlySeries,
  simpleAnnualizedFromMonthlyAvg,
} from './live-stats'

const demo: DemoDashboardStats = {
  tradingDayCount: 1025,
  tradeCount: 3545,
  winCount: 2900,
  lossCount: 645,
  winRatePct: 88.2,
  positiveDayPct: 88.2,
  avgMonthlyReturnPct: 15.3,
  monthsInBand: 48,
  monthCount: 48,
  bestDay: { date: '2026-08-04', returnPct: 6.2 },
  worstDay: { date: '2025-12-04', returnPct: -0.8 },
  bestMonth: { yearMonth: '2025-08', returnPct: 17 },
  worstMonth: { yearMonth: '2024-04', returnPct: 13.31 },
  totalReturnPct: 734.4,
  endingEquity: 834.4,
  startingEquity: 100,
  simpleAnnualizedReturnPct: 183.6,
  returnModel: 'simple',
}

describe('canonical public demo performance source', () => {
  it('treats a 4-year demo dataset as usable', () => {
    expect(demoHistoryUsable(demo)).toBe(true)
    expect(demoHistoryUsable({ ...demo, monthCount: 6 })).toBe(false)
  })

  it('does not let publicMeta override demo averages, days, or simple annualized return', () => {
    const stats = buildLandingLiveStats({
      pub: {
        meta: {
          tradingDayCount: 584,
          tradeCount: 10,
          monthCount: 24,
          yearsOfPerformance: 2,
          avgMonthlyReturnPct: '0.4',
          winRatePct: '50.0',
          totalReturnPct: '1255',
          cagrPct: '132.9',
          startDate: '2024-01-01',
          endDate: '2026-01-01',
          bestDay: { date: '2024-06-01', returnPct: '0.4' },
          worstDay: { date: '2024-06-02', returnPct: '-1.1' },
        },
        monthly: [{ month: '2026-01', returnPct: '0.4' }],
        yearly: [],
        analytics: {},
        summary: {},
      } as never,
      demo,
      demoMeta: {
        startDate: '2022-09-01',
        endDate: '2026-08-05',
        totalReturnPct: 734.4,
      },
      monthCount: 48,
    })

    expect(stats.avgMonthlyReturn).toBe('15.3')
    expect(stats.tradingDays).toBe('1025')
    expect(stats.winRate).toBe('88.2')
    expect(stats.bestDay).toBe('6.2')
    expect(stats.worstDayAbs).toBe('0.8')
    expect(stats.yearlyReturn).toBe('183.6')
    expect(stats.totalReturn).toBe('734')
    expect(stats.yearsOfPerformance).toBe('4')
    expect(stats.monthCount).toBe('48')
    expect(stats.yearlyReturn).not.toBe('469.8')
    expect(stats.yearlyReturn).not.toBe('132.9')
  })

  it('prefers 48 demo months over a conflicting API monthly series', () => {
    const demoMonthly = Array.from({ length: 48 }, (_, i) => ({
      yearMonth: `2022-${String((i % 12) + 1).padStart(2, '0')}`,
      year: 2022,
      month: (i % 12) + 1,
      label: 'x',
      returnPct: 15.3,
      tradingDays: 21,
      inPresentationBand: true,
    })) as DemoMonthlyReturn[]

    const series = resolveMonthlySeries([{ month: '2026-01', returnPct: 0.4 }], demoMonthly)
    expect(series).toHaveLength(48)
    expect(series[0]?.returnPct).toBe(15.3)
  })

  it('accumulates Growth of $100 with simple returns against original principal', () => {
    const rows = buildGrowthOf100Rows([
      { month: '2022-09', returnPct: 14 },
      { month: '2022-10', returnPct: 16 },
      { month: '2022-11', returnPct: 15 },
    ])
    expect(rows[0]?.portfolioValue).toBeCloseTo(114, 4)
    expect(rows[1]?.portfolioValue).toBeCloseTo(130, 4)
    expect(rows[2]?.portfolioValue).toBeCloseTo(145, 4)
    const ending = rows.at(-1)?.portfolioValue ?? 0
    const simpleProfit = 100 * (0.14 + 0.16 + 0.15)
    expect(ending).toBeCloseTo(100 + simpleProfit, 4)
    expect(ending).not.toBeCloseTo(100 * 1.14 * 1.16 * 1.15, 2)
  })

  it('uses simple annualized return instead of CAGR for public demo', () => {
    expect(simpleAnnualizedFromMonthlyAvg(15.3)).toBeCloseTo(183.6, 4)
    const stats = buildLandingLiveStats({ demo })
    expect(stats.yearlyReturn).toBe('183.6')
    expect(stats.yearlyReturn).not.toContain('469')
  })
})
