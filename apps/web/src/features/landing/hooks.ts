'use client'

import { useMemo } from 'react'

import { usePublishedDownloads } from '@/features/cms/frontend-hooks'
import { usePublishedLanding } from '@/features/cms/site'
import { usePublicPerformance } from '@/features/performance/hooks'
import {
  useDemoCharts,
  useDemoDashboardStats,
  useDemoMonthlyReturns,
} from '@/lib/demo-backtest/hooks'
import { QUERY_STALE_TIME } from '@/lib/constants'

import {
  buildLandingLiveStats,
  resolveMonthlySeries,
  resolveYearlySeries,
  type LandingLiveStats,
  type LandingMonthlyPoint,
} from './live-stats'

export function useLandingLiveStats(): {
  stats: LandingLiveStats
  isLoading: boolean
  isReady: boolean
} {
  const { landing: cms, isLoading: cmsLoading } = usePublishedLanding()
  const { data: pub, isLoading: pubLoading } = usePublicPerformance()
  const { data: demo, isLoading: demoLoading } = useDemoDashboardStats()
  // Prefer tiny dashboard_stats over charts.json (~104 KiB) for marketing counters.
  const { data: demoMonthly } = useDemoMonthlyReturns()
  const { data: reports } = usePublishedDownloads()

  const monthlySeries = useMemo(
    () => resolveMonthlySeries(pub?.monthly, demoMonthly),
    [pub?.monthly, demoMonthly],
  )

  const stats = useMemo(
    () =>
      buildLandingLiveStats({
        pub,
        demo,
        demoMeta: demo
          ? {
              totalReturnPct: demo.totalReturnPct,
              startDate: undefined,
              endDate: undefined,
            }
          : null,
        cms: {
          investorCount: cms.investorCount,
          aum: cms.aum,
          countries: cms.countries,
          avgMonthlyReturn: cms.avgMonthlyReturn,
          winRate: cms.winRate,
          bestDay: cms.bestDay,
        },
        reportCount: reports?.length ?? 0,
        monthCount: monthlySeries.length,
      }),
    [pub, demo, cms, reports?.length, monthlySeries.length],
  )

  return {
    stats,
    isLoading: cmsLoading || pubLoading || demoLoading,
    isReady: Boolean(demo) || Boolean(pub) || monthlySeries.length > 0,
  }
}

export function useLandingMonthlySeries(): {
  data: LandingMonthlyPoint[]
  isLoading: boolean
} {
  const { data: pub, isLoading: pubLoading } = usePublicPerformance()
  const { data: demoMonthly, isLoading: demoLoading } = useDemoMonthlyReturns()

  const data = useMemo(
    () => resolveMonthlySeries(pub?.monthly, demoMonthly),
    [pub?.monthly, demoMonthly],
  )

  return { data, isLoading: pubLoading || demoLoading }
}

export function useLandingYearlySeries() {
  const { data: pub } = usePublicPerformance()
  const { data: charts } = useDemoCharts()
  const { data: demoMonthly } = useDemoMonthlyReturns()

  return useMemo(
    () => resolveYearlySeries(pub?.yearly, charts?.yearlyReturns, demoMonthly),
    [pub?.yearly, charts?.yearlyReturns, demoMonthly],
  )
}

/** Re-export stale time so landing queries stay consistent if needed later. */
export const LANDING_STATS_STALE = QUERY_STALE_TIME.slow
