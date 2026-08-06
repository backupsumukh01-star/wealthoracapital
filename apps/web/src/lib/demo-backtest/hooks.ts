'use client'

import { useQuery } from '@tanstack/react-query'

import { DEMO_BACKTEST_FILES } from './paths'
import type {
  DemoChartsPayload,
  DemoDailyReturn,
  DemoDashboardStats,
  DemoMonthlyReturn,
  DemoReportCatalog,
  DemoTrade,
} from './types'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`)
  return res.json() as Promise<T>
}

export function useDemoDashboardStats() {
  return useQuery({
    queryKey: ['demo-backtest', 'dashboard-stats'],
    queryFn: () => fetchJson<DemoDashboardStats>(DEMO_BACKTEST_FILES.dashboardStats),
    staleTime: Infinity,
  })
}

export function useDemoCharts() {
  return useQuery({
    queryKey: ['demo-backtest', 'charts'],
    queryFn: () => fetchJson<DemoChartsPayload>(DEMO_BACKTEST_FILES.charts),
    staleTime: Infinity,
  })
}

export function useDemoMonthlyReturns() {
  return useQuery({
    queryKey: ['demo-backtest', 'monthly-returns'],
    queryFn: () => fetchJson<DemoMonthlyReturn[]>(DEMO_BACKTEST_FILES.monthlyReturns),
    staleTime: Infinity,
  })
}

export function useDemoDailyReturns() {
  return useQuery({
    queryKey: ['demo-backtest', 'daily-returns'],
    queryFn: () => fetchJson<DemoDailyReturn[]>(DEMO_BACKTEST_FILES.dailyReturns),
    staleTime: Infinity,
  })
}

export function useDemoTrades() {
  return useQuery({
    queryKey: ['demo-backtest', 'trades'],
    queryFn: () => fetchJson<DemoTrade[]>(DEMO_BACKTEST_FILES.trades),
    staleTime: Infinity,
  })
}

export function useDemoReportCatalog() {
  return useQuery({
    queryKey: ['demo-backtest', 'report-catalog'],
    queryFn: () => fetchJson<DemoReportCatalog>(DEMO_BACKTEST_FILES.reportCatalog),
    staleTime: Infinity,
  })
}
