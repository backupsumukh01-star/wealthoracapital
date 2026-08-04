/**
 * Realistic dummy data for the investor dashboard.
 * Presentation only — not connected to any API or database.
 */

import type { MoneyString } from '@meridian/shared'
import type { Session as AppSession } from '@/providers/session-provider'

export const DEMO_PROFILE = {
  id: 'usr_demo_ayesha',
  firstName: 'Ayesha',
  lastName: 'Khan',
  email: 'investor@growzy.com',
  phone: '+92 300 555 0142',
  country: 'PK',
  memberSince: '2025-05-14T12:00:00.000Z',
  plan: 'Growth',
  verificationStatus: 'Verified' as const,
  avatarUrl: null as string | null,
  referralCode: 'GRZ-AYESHA',
  referralLink: 'https://growzy.com/r/GRZ-AYESHA',
}

export const DEMO_WALLET = {
  balance: '12480.75' as MoneyString,
  availableBalance: '12380.75' as MoneyString,
  lockedBalance: '100.00' as MoneyString,
  investedAmount: '10000.00' as MoneyString,
  totalProfit: '2480.75' as MoneyString,
  totalDeposited: '11000.00' as MoneyString,
  totalWithdrawn: '1000.00' as MoneyString,
  pendingDeposit: '500.00' as MoneyString,
  pendingWithdrawal: '100.00' as MoneyString,
  todayProfit: '87.36' as MoneyString,
  todayReturnPct: '0.70',
  monthlyReturnPct: '6.40',
  totalRoiPct: '24.81',
  growthPct30d: '5.20',
}

export const DEMO_SESSION: AppSession = {
  user: {
    id: DEMO_PROFILE.id,
    email: DEMO_PROFILE.email,
    firstName: DEMO_PROFILE.firstName,
    lastName: DEMO_PROFILE.lastName,
    phone: DEMO_PROFILE.phone,
    country: DEMO_PROFILE.country,
    timezone: 'Asia/Karachi',
    avatarUrl: DEMO_PROFILE.avatarUrl,
    role: 'USER',
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    emailVerified: true,
    createdAt: '2025-05-14T09:00:00.000Z',
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

function series(points: { date: string; balance: number; profit: number }[]) {
  return points.map((p) => ({
    date: p.date,
    balance: p.balance.toFixed(2),
    profit: p.profit.toFixed(2),
  }))
}

export const GROWTH_CHART: Record<
  ChartRange,
  { date: string; balance: string; profit: string }[]
> = {
  '1D': series([
    { date: '00:00', balance: 12390, profit: 0 },
    { date: '04:00', balance: 12405, profit: 15 },
    { date: '08:00', balance: 12420, profit: 15 },
    { date: '12:00', balance: 12410, profit: -10 },
    { date: '16:00', balance: 12455, profit: 45 },
    { date: '18:05', balance: 12480.75, profit: 25.75 },
  ]),
  '1W': series([
    { date: 'Mon', balance: 12110, profit: 90 },
    { date: 'Tue', balance: 12240, profit: 130 },
    { date: 'Wed', balance: 12190, profit: -50 },
    { date: 'Thu', balance: 12320, profit: 130 },
    { date: 'Fri', balance: 12390, profit: 70 },
    { date: 'Sat', balance: 12420, profit: 30 },
    { date: 'Sun', balance: 12480.75, profit: 60.75 },
  ]),
  '1M': series([
    { date: 'Jul 03', balance: 11840, profit: 42 },
    { date: 'Jul 07', balance: 11910, profit: 70 },
    { date: 'Jul 11', balance: 11860, profit: -50 },
    { date: 'Jul 15', balance: 12020, profit: 160 },
    { date: 'Jul 19', balance: 12110, profit: 90 },
    { date: 'Jul 23', balance: 12070, profit: -40 },
    { date: 'Jul 27', balance: 12240, profit: 170 },
    { date: 'Jul 31', balance: 12390, profit: 150 },
    { date: 'Aug 02', balance: 12480.75, profit: 87.36 },
  ]),
  '3M': series([
    { date: 'May', balance: 10800, profit: 180 },
    { date: 'Jun', balance: 11340, profit: 540 },
    { date: 'Jul', balance: 12110, profit: 770 },
    { date: 'Aug', balance: 12480.75, profit: 370 },
  ]),
  '6M': series([
    { date: 'Mar', balance: 9800, profit: 120 },
    { date: 'Apr', balance: 10240, profit: 440 },
    { date: 'May', balance: 10800, profit: 560 },
    { date: 'Jun', balance: 11340, profit: 540 },
    { date: 'Jul', balance: 12110, profit: 770 },
    { date: 'Aug', balance: 12480.75, profit: 370 },
  ]),
  '1Y': series([
    { date: 'Sep', balance: 8200, profit: 90 },
    { date: 'Oct', balance: 8650, profit: 450 },
    { date: 'Nov', balance: 9100, profit: 450 },
    { date: 'Dec', balance: 9550, profit: 450 },
    { date: 'Jan', balance: 9900, profit: 350 },
    { date: 'Feb', balance: 10200, profit: 300 },
    { date: 'Mar', balance: 9800, profit: -400 },
    { date: 'Apr', balance: 10240, profit: 440 },
    { date: 'May', balance: 10800, profit: 560 },
    { date: 'Jun', balance: 11340, profit: 540 },
    { date: 'Jul', balance: 12110, profit: 770 },
    { date: 'Aug', balance: 12480.75, profit: 370 },
  ]),
  ALL: series([
    { date: '2025 Q2', balance: 5000, profit: 120 },
    { date: '2025 Q3', balance: 7200, profit: 820 },
    { date: '2025 Q4', balance: 9100, profit: 1100 },
    { date: '2026 Q1', balance: 10200, profit: 900 },
    { date: '2026 Q2', balance: 11340, profit: 1140 },
    { date: '2026 Q3', balance: 12480.75, profit: 1140 },
  ]),
}

/** Portfolio allocation for donut — demo weights only. */
export const PORTFOLIO_ALLOCATION = [
  { id: 'forex', label: 'Forex', value: 72, color: '#12D6A0' },
  { id: 'crypto', label: 'Crypto', value: 12, color: '#2AE8FF' },
  { id: 'cash', label: 'Cash', value: 11, color: '#5EF2C4' },
  { id: 'pending', label: 'Pending', value: 5, color: '#F59E0B' },
] as const

export const MARKET_SNAPSHOT = [
  {
    id: 'eurusd',
    symbol: 'EUR/USD',
    price: '1.1782',
    changePct: '0.24',
    decimals: 4,
    spark: [1.17, 1.172, 1.169, 1.174, 1.176, 1.178, 1.1782],
  },
  {
    id: 'gbpusd',
    symbol: 'GBP/USD',
    price: '1.2795',
    changePct: '-0.12',
    decimals: 4,
    spark: [1.284, 1.282, 1.281, 1.28, 1.278, 1.279, 1.2795],
  },
  {
    id: 'usdjpy',
    symbol: 'USD/JPY',
    price: '149.82',
    changePct: '0.18',
    decimals: 2,
    spark: [149.1, 149.4, 149.2, 149.55, 149.7, 149.65, 149.82],
  },
  {
    id: 'xauusd',
    symbol: 'XAU/USD',
    price: '2418.60',
    changePct: '0.41',
    decimals: 2,
    spark: [2390, 2398, 2405, 2402, 2410, 2415, 2418.6],
  },
  {
    id: 'btc',
    symbol: 'BTC/USD',
    price: '68420',
    changePct: '1.82',
    decimals: 0,
    spark: [65200, 66100, 65800, 67200, 67800, 68100, 68420],
  },
  {
    id: 'eth',
    symbol: 'ETH/USD',
    price: '3482',
    changePct: '0.95',
    decimals: 0,
    spark: [3320, 3380, 3360, 3410, 3440, 3465, 3482],
  },
] as const

/**
 * Next daily settlement — always the upcoming 18:00 UTC so the countdown stays live in demos.
 * `NEXT_DISTRIBUTION_AT` kept for any static references.
 */
export function getNextSettlementAt(from = new Date()): Date {
  const target = new Date(from)
  target.setUTCHours(18, 0, 0, 0)
  if (target.getTime() <= from.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1)
  }
  return target
}

/** @deprecated Prefer getNextSettlementAt() for live countdown. */
export const NEXT_DISTRIBUTION_AT = '2026-08-03T18:00:00.000Z'

export const MONTHLY_PROFIT = '726.40' as MoneyString

export const RECENT_TRADES = [
  {
    id: 'trd_01',
    date: '2026-08-02T14:20:00.000Z',
    pair: 'EUR/USD',
    direction: 'BUY' as const,
    entry: '1.1700',
    exit: '1.1782',
    returnPct: '0.70',
    status: 'WIN' as const,
  },
  {
    id: 'trd_02',
    date: '2026-08-01T16:05:00.000Z',
    pair: 'GBP/USD',
    direction: 'SELL' as const,
    entry: '1.2840',
    exit: '1.2821',
    returnPct: '0.15',
    status: 'WIN' as const,
  },
  {
    id: 'trd_03',
    date: '2026-07-31T11:40:00.000Z',
    pair: 'USD/JPY',
    direction: 'BUY' as const,
    entry: '149.20',
    exit: '149.05',
    returnPct: '-0.10',
    status: 'LOSS' as const,
  },
  {
    id: 'trd_04',
    date: '2026-07-30T09:15:00.000Z',
    pair: 'XAU/USD',
    direction: 'SELL' as const,
    entry: '2412.40',
    exit: '2401.10',
    returnPct: '0.47',
    status: 'WIN' as const,
  },
  {
    id: 'trd_05',
    date: '2026-07-29T13:55:00.000Z',
    pair: 'AUD/USD',
    direction: 'BUY' as const,
    entry: '0.6520',
    exit: '0.6558',
    returnPct: '0.58',
    status: 'WIN' as const,
  },
]

export type TradeLifecycle = 'Completed' | 'Pending' | 'Cancelled'
export type TradeResult = 'WIN' | 'LOSS' | 'FLAT'

/** Full trade history for the investor Trade History page (demo). */
export const TRADE_HISTORY = [
  {
    id: 'trd_01',
    date: '2026-08-02T14:20:00.000Z',
    pair: 'EUR/USD',
    direction: 'BUY' as const,
    entry: '1.1700',
    exit: '1.1782',
    lot: '1.20',
    pips: '+82.0',
    returnPct: '0.70',
    profit: '87.36',
    result: 'WIN' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_02',
    date: '2026-08-01T16:05:00.000Z',
    pair: 'GBP/USD',
    direction: 'SELL' as const,
    entry: '1.2840',
    exit: '1.2821',
    lot: '0.80',
    pips: '+19.0',
    returnPct: '0.15',
    profit: '18.72',
    result: 'WIN' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_03',
    date: '2026-07-31T11:40:00.000Z',
    pair: 'USD/JPY',
    direction: 'BUY' as const,
    entry: '149.20',
    exit: '149.05',
    lot: '1.00',
    pips: '-15.0',
    returnPct: '-0.10',
    profit: '-12.48',
    result: 'LOSS' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_04',
    date: '2026-07-30T09:15:00.000Z',
    pair: 'XAU/USD',
    direction: 'SELL' as const,
    entry: '2412.40',
    exit: '2401.10',
    lot: '0.40',
    pips: '+113.0',
    returnPct: '0.47',
    profit: '58.65',
    result: 'WIN' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_05',
    date: '2026-07-29T13:55:00.000Z',
    pair: 'AUD/USD',
    direction: 'BUY' as const,
    entry: '0.6520',
    exit: '0.6558',
    lot: '1.50',
    pips: '+38.0',
    returnPct: '0.58',
    profit: '72.40',
    result: 'WIN' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_06',
    date: '2026-08-02T18:10:00.000Z',
    pair: 'EUR/USD',
    direction: 'SELL' as const,
    entry: '1.1795',
    exit: '—',
    lot: '0.60',
    pips: '—',
    returnPct: '0.00',
    profit: '0.00',
    result: 'FLAT' as TradeResult,
    lifecycle: 'Pending' as TradeLifecycle,
  },
  {
    id: 'trd_07',
    date: '2026-07-28T08:22:00.000Z',
    pair: 'BTC/USD',
    direction: 'BUY' as const,
    entry: '67200',
    exit: '—',
    lot: '0.10',
    pips: '—',
    returnPct: '0.00',
    profit: '0.00',
    result: 'FLAT' as TradeResult,
    lifecycle: 'Cancelled' as TradeLifecycle,
  },
  {
    id: 'trd_08',
    date: '2026-07-27T15:40:00.000Z',
    pair: 'GBP/USD',
    direction: 'BUY' as const,
    entry: '1.2750',
    exit: '1.2710',
    lot: '0.90',
    pips: '-40.0',
    returnPct: '-0.31',
    profit: '-38.70',
    result: 'LOSS' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_09',
    date: '2026-07-26T12:05:00.000Z',
    pair: 'ETH/USD',
    direction: 'BUY' as const,
    entry: '3410',
    exit: '3482',
    lot: '0.25',
    pips: '+72.0',
    returnPct: '0.95',
    profit: '118.50',
    result: 'WIN' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
  {
    id: 'trd_10',
    date: '2026-07-25T10:18:00.000Z',
    pair: 'USD/JPY',
    direction: 'SELL' as const,
    entry: '150.10',
    exit: '149.82',
    lot: '1.10',
    pips: '+28.0',
    returnPct: '0.19',
    profit: '23.70',
    result: 'WIN' as TradeResult,
    lifecycle: 'Completed' as TradeLifecycle,
  },
] as const


export const PERFORMANCE_SUMMARY = {
  todayReturnPct: '0.70',
  weeklyReturnPct: '2.15',
  monthlyReturnPct: '6.40',
  yearlyReturnPct: '24.81',
  bestDay: { date: '2026-07-14T12:00:00.000Z', returnPct: '1.85', profit: '214.30' },
  worstDay: { date: '2026-07-22T12:00:00.000Z', returnPct: '-0.64', profit: '-74.10' },
  avgDailyReturnPct: '0.31',
  winRatePct: '78.6',
}

/** Calendar days for current month view — profit | loss | none */
export type CalendarDayStatus = 'profit' | 'loss' | 'none' | 'empty'

export const PERFORMANCE_CALENDAR: {
  monthLabel: string
  year: number
  month: number // 0-indexed
  days: { day: number; status: CalendarDayStatus; returnPct?: string }[]
} = {
  monthLabel: 'August 2026',
  year: 2026,
  month: 7,
  days: [
    { day: 1, status: 'profit', returnPct: '0.45' },
    { day: 2, status: 'profit', returnPct: '0.70' },
    { day: 3, status: 'none' },
    { day: 4, status: 'loss', returnPct: '-0.22' },
    { day: 5, status: 'profit', returnPct: '0.38' },
    { day: 6, status: 'profit', returnPct: '0.51' },
    { day: 7, status: 'none' },
    { day: 8, status: 'profit', returnPct: '0.29' },
    { day: 9, status: 'loss', returnPct: '-0.15' },
    { day: 10, status: 'profit', returnPct: '0.62' },
    { day: 11, status: 'profit', returnPct: '0.41' },
    { day: 12, status: 'none' },
    { day: 13, status: 'profit', returnPct: '0.55' },
    { day: 14, status: 'profit', returnPct: '0.33' },
    { day: 15, status: 'loss', returnPct: '-0.48' },
    { day: 16, status: 'none' },
    { day: 17, status: 'profit', returnPct: '0.44' },
    { day: 18, status: 'profit', returnPct: '0.27' },
    { day: 19, status: 'profit', returnPct: '0.58' },
    { day: 20, status: 'none' },
    { day: 21, status: 'profit', returnPct: '0.36' },
    { day: 22, status: 'loss', returnPct: '-0.31' },
    { day: 23, status: 'profit', returnPct: '0.49' },
    { day: 24, status: 'none' },
    { day: 25, status: 'profit', returnPct: '0.40' },
    { day: 26, status: 'profit', returnPct: '0.22' },
    { day: 27, status: 'profit', returnPct: '0.67' },
    { day: 28, status: 'none' },
    { day: 29, status: 'profit', returnPct: '0.35' },
    { day: 30, status: 'loss', returnPct: '-0.18' },
    { day: 31, status: 'profit', returnPct: '0.52' },
  ],
}

export const RECENT_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'DAILY_PROFIT' as const,
    title: 'Daily profit added',
    body: 'Today’s return: +0.70% · +$87.36 credited to your wallet.',
    time: '12 min ago',
    unread: true,
  },
  {
    id: 'n2',
    type: 'DEPOSIT_APPROVED' as const,
    title: 'Deposit approved',
    body: 'DEP-2026-000412 · $1,000.00 is now in your balance.',
    time: 'Yesterday',
    unread: true,
  },
  {
    id: 'n3',
    type: 'WITHDRAWAL_APPROVED' as const,
    title: 'Withdrawal approved',
    body: 'WDR-2026-000088 · $250.00 is being sent to your bank.',
    time: '3 days ago',
    unread: false,
  },
  {
    id: 'n4',
    type: 'ANNOUNCEMENT' as const,
    title: 'Desk note',
    body: 'London session liquidity is elevated this week. Settlements remain on schedule.',
    time: '5 days ago',
    unread: false,
  },
]

export const RECENT_TRANSACTIONS = [
  {
    id: 'tx1',
    type: 'DAILY_PROFIT' as const,
    label: 'Daily profit',
    reference: 'RUN-2026-08-02',
    amount: '87.36',
    date: '2026-08-02T18:05:00.000Z',
  },
  {
    id: 'tx2',
    type: 'DEPOSIT' as const,
    label: 'Deposit approved',
    reference: 'DEP-2026-000412',
    amount: '1000.00',
    date: '2026-08-01T11:20:00.000Z',
  },
  {
    id: 'tx3',
    type: 'DAILY_PROFIT' as const,
    label: 'Daily profit',
    reference: 'RUN-2026-08-01',
    amount: '52.10',
    date: '2026-08-01T18:02:00.000Z',
  },
  {
    id: 'tx4',
    type: 'WITHDRAWAL' as const,
    label: 'Withdrawal paid',
    reference: 'WDR-2026-000088',
    amount: '-250.00',
    date: '2026-07-28T15:40:00.000Z',
  },
  {
    id: 'tx5',
    type: 'ADJUSTMENT' as const,
    label: 'Goodwill credit',
    reference: 'ADJ-4471',
    amount: '25.00',
    date: '2026-07-20T09:15:00.000Z',
  },
]

export const REFERRAL_STATS = {
  invited: 12,
  funded: 5,
  earnings: '340.00' as MoneyString,
  link: DEMO_PROFILE.referralLink,
  code: DEMO_PROFILE.referralCode,
}

export const UNREAD_NOTIFICATION_COUNT = RECENT_NOTIFICATIONS.filter((n) => n.unread).length
