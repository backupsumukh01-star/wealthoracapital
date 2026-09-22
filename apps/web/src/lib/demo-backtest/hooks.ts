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

export function useDemoCharts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['demo-backtest', 'charts'],
    queryFn: () => fetchJson<DemoChartsPayload>(DEMO_BACKTEST_FILES.charts),
    staleTime: Infinity,
    enabled: options?.enabled,
  })
}

export function useDemoMonthlyReturns(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['demo-backtest', 'monthly-returns'],
    queryFn: () => fetchJson<DemoMonthlyReturn[]>(DEMO_BACKTEST_FILES.monthlyReturns),
    staleTime: Infinity,
    enabled: options?.enabled,
  })
}

export function useDemoDailyReturns(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['demo-backtest', 'daily-returns'],
    queryFn: () => fetchJson<DemoDailyReturn[]>(DEMO_BACKTEST_FILES.dailyReturns),
    staleTime: Infinity,
    enabled: options?.enabled,
  })
}

export function useDemoTrades(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['demo-backtest', 'trades'],
    queryFn: () => fetchJson<DemoTrade[]>(DEMO_BACKTEST_FILES.trades),
    staleTime: Infinity,
    enabled: options?.enabled,
  })
}

/** Homepage blotter — recent trades only (~80 KiB vs full trades.json). */
export function useDemoTradesPreview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['demo-backtest', 'trades-preview'],
    queryFn: () => fetchJson<DemoTrade[]>(DEMO_BACKTEST_FILES.tradesPreview),
    staleTime: Infinity,
    enabled: options?.enabled,
  })
}

export function useDemoReportCatalog() {
  return useQuery({
    queryKey: ['demo-backtest', 'report-catalog'],
    queryFn: () => fetchJson<DemoReportCatalog>(DEMO_BACKTEST_FILES.reportCatalog),
    staleTime: Infinity,
  })
}
