/* eslint-disable @typescript-eslint/no-explicit-any */

/** Production stubs — empty fixtures. Prefer wallet/trade/performance API hooks. */

import type { MoneyString } from '@meridian/shared'
import type { Session as AppSession } from '@/providers/session-provider'

export const DEMO_PROFILE = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  memberSince: new Date(0).toISOString(),
  plan: '',
  verificationStatus: 'Pending' as const,
  avatarUrl: null as string | null,
  referralCode: '',
  referralLink: '',
}

export const DEMO_WALLET = {
  balance: '0.00' as MoneyString,
  availableBalance: '0.00' as MoneyString,
  lockedBalance: '0.00' as MoneyString,
  investedAmount: '0.00' as MoneyString,
  totalProfit: '0.00' as MoneyString,
  totalDeposited: '0.00' as MoneyString,
  totalWithdrawn: '0.00' as MoneyString,
  pendingDeposit: '0.00' as MoneyString,
  pendingWithdrawal: '0.00' as MoneyString,
  todayProfit: '0.00' as MoneyString,
  todayReturnPct: '0',
  monthlyReturnPct: '0',
  totalRoiPct: '0',
  growthPct30d: '0',
}

export const DEMO_SESSION: AppSession = {
  user: {
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: null,
    country: null,
    timezone: '',
    avatarUrl: null,
    role: 'USER',
    staffRole: null,
    permissions: [],
    status: 'ACTIVE',
    kycStatus: 'NOT_STARTED',
    emailVerified: false,
    createdAt: new Date(0).toISOString(),
  },
  wallet: {
    balance: DEMO_WALLET.balance,
    availableBalance: DEMO_WALLET.availableBalance,
    lockedBalance: DEMO_WALLET.lockedBalance,
    investedAmount: DEMO_WALLET.investedAmount,
    totalProfit: DEMO_WALLET.totalProfit,
    totalDeposited: DEMO_WALLET.totalDeposited,
    totalWithdrawn: DEMO_WALLET.totalWithdrawn,
    currency: 'USD',
  },
}

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
export type TradeLifecycle = 'Completed' | 'Pending' | 'Cancelled'
export type TradeResult = 'WIN' | 'LOSS' | 'FLAT'
export type CalendarDayStatus = 'profit' | 'loss' | 'none' | 'empty'

export const GROWTH_CHART: Record<
  ChartRange,
  { labels: string[]; equity: number[]; daily: number[]; series?: unknown[] }
> = {
  '1D': { labels: [], equity: [], daily: [], series: [] },
  '1W': { labels: [], equity: [], daily: [], series: [] },
  '1M': { labels: [], equity: [], daily: [], series: [] },
  '3M': { labels: [], equity: [], daily: [], series: [] },
  '6M': { labels: [], equity: [], daily: [], series: [] },
  '1Y': { labels: [], equity: [], daily: [], series: [] },
  ALL: { labels: [], equity: [], daily: [], series: [] },
}

export const PORTFOLIO_ALLOCATION = [] as any[]
export const MARKET_SNAPSHOT = [] as any[]
export const RECENT_TRADES = [] as any[]
export const TRADE_HISTORY = [] as any[]
export const PERFORMANCE_SUMMARY = {
  totalRoiPct: '0',
  monthlyReturnPct: '0',
  weeklyReturnPct: '0',
  yearlyReturnPct: '0',
  todayReturnPct: '0',
  avgDailyReturnPct: '0',
  winRatePct: '0',
  bestDayPct: '0',
  worstDayPct: '0',
  tradingDays: 0,
  bestDay: { date: '', returnPct: '0', profit: '0.00' },
  worstDay: { date: '', returnPct: '0', profit: '0.00' },
}
export const PERFORMANCE_CALENDAR = {
  year: new Date().getUTCFullYear(),
  month: new Date().getUTCMonth(),
  monthLabel: '',
  days: [] as any[],
}
export const RECENT_NOTIFICATIONS = [] as any[]
export const RECENT_TRANSACTIONS = [] as any[]
export const REFERRAL_STATS = {
  invited: 0,
  earned: '0.00' as MoneyString,
  link: '',
  code: '',
}
export const UNREAD_NOTIFICATION_COUNT = 0
export const NEXT_DISTRIBUTION_AT: string | null = null
export const MONTHLY_PROFIT = '0.00' as MoneyString

export function getNextSettlementAt(from = new Date()): Date {
  const d = new Date(from)
  d.setUTCHours(18, 0, 0, 0)
  if (d <= from) d.setUTCDate(d.getUTCDate() + 1)
  return d
}
