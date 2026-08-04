/**
 * Growzy Admin Portal — mock data only.
 * Swap for API responses later; shapes mirror docs/07 + docs/09.
 */

import type { MoneyString } from '@meridian/shared'

export type AdminKycStatus = 'NOT_STARTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
export type AdminAccountStatus =
  | 'PENDING_EMAIL'
  | 'PENDING_KYC'
  | 'VERIFIED'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'REJECTED'

export type AdminDepositStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEED_INFO'
export type AdminWithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
export type AdminTradeDirection = 'LONG' | 'SHORT'

export type AdminInvestor = {
  userId: string
  username: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  countryCode: string
  avatarInitials: string
  kycStatus: AdminKycStatus
  accountStatus: AdminAccountStatus
  walletBalance: MoneyString
  totalDeposited: MoneyString
  totalWithdrawn: MoneyString
  totalProfit: MoneyString
  registeredAt: string
  investorSince: string | null
  referralCode: string
  occupation?: string
  address?: string
  city?: string
  dob?: string
  idType?: 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID'
}

export type AdminDeposit = {
  id: string
  userId: string
  amount: MoneyString
  method: string
  reference: string
  status: AdminDepositStatus
  submittedAt: string
  proofLabel: string
  note?: string
}

export type AdminWithdrawal = {
  id: string
  userId: string
  amount: MoneyString
  destination: string
  destinationDetail: string
  availableBalance: MoneyString
  status: AdminWithdrawalStatus
  requestedAt: string
}

export type AdminReturnRun = {
  id: string
  tradingDay: string
  returnPct: string
  notes: string
  status: 'DRAFT' | 'PREVIEWED' | 'APPLIED'
  eligibleWallets: number
  distributed: MoneyString
  publishedAt?: string
  publishedBy?: string
}

export type AdminTrade = {
  id: string
  tradingDay: string
  pair: string
  direction: AdminTradeDirection
  entry: string
  exit: string
  profitPct: string
  profitUsd: MoneyString
  notes: string
  publishedAt: string
  publishedBy: string
}

export type AdminNotificationDraft = {
  id: string
  title: string
  body: string
  target: 'ALL' | 'SELECTED' | 'SINGLE'
  audienceLabel: string
  channel: 'IN_APP' | 'EMAIL' | 'BOTH'
  createdAt: string
  status: 'DRAFT' | 'SENT'
}

export type AdminAuditEntry = {
  id: string
  at: string
  actor: string
  action: string
  target: string
  detail: string
}

export const ADMIN_DEMO = {
  email: 'admin@growzy.com',
  password: 'GrowzyAdmin2026!',
  otp: '123456',
} as const

export const ADMIN_STATS = {
  totalInvestors: 1284,
  pendingKyc: 18,
  verifiedUsers: 1092,
  todayDeposits: '142850.00' as MoneyString,
  todayWithdrawals: '62840.00' as MoneyString,
  pendingDeposits: 7,
  pendingWithdrawals: 4,
  todayReturnPct: '0.72',
  aum: '2841500.00' as MoneyString,
  monthlyGrowthPct: '6.40',
  lifetimeProfitPaid: '412880.50' as MoneyString,
}

export const ADMIN_AUM_SERIES = [
  { label: 'Mon', aum: 2_710_000, deposits: 42_000, withdrawals: 18_000 },
  { label: 'Tue', aum: 2_735_000, deposits: 38_500, withdrawals: 22_100 },
  { label: 'Wed', aum: 2_768_000, deposits: 51_200, withdrawals: 19_400 },
  { label: 'Thu', aum: 2_790_000, deposits: 44_800, withdrawals: 28_600 },
  { label: 'Fri', aum: 2_812_000, deposits: 61_000, withdrawals: 31_200 },
  { label: 'Sat', aum: 2_825_000, deposits: 28_400, withdrawals: 12_800 },
  { label: 'Sun', aum: 2_841_500, deposits: 142_850, withdrawals: 62_840 },
]

export const ADMIN_RETURN_SERIES = [
  { day: 'Jul 28', pct: 0.55 },
  { day: 'Jul 29', pct: 0.68 },
  { day: 'Jul 30', pct: -0.12 },
  { day: 'Jul 31', pct: 0.74 },
  { day: 'Aug 01', pct: 0.61 },
  { day: 'Aug 02', pct: 0.72 },
]

export const ADMIN_INVESTORS: AdminInvestor[] = [
  {
    userId: 'GRZ-100001',
    username: 'ayesha',
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'investor@growzy.com',
    phone: '+92 300 555 0142',
    country: 'Pakistan',
    countryCode: 'PK',
    avatarInitials: 'AK',
    kycStatus: 'APPROVED',
    accountStatus: 'VERIFIED',
    walletBalance: '12480.75',
    totalDeposited: '11000.00',
    totalWithdrawn: '1000.00',
    totalProfit: '2480.75',
    registeredAt: '2025-05-14T12:00:00.000Z',
    investorSince: '2025-05-15T09:00:00.000Z',
    referralCode: 'GRZ-AYESHA',
    occupation: 'Investor',
    address: 'Clifton Block 5',
    city: 'Karachi',
    dob: '1994-06-12',
    idType: 'PASSPORT',
  },
  {
    userId: 'GRZ-104829',
    username: 'harsh1048',
    firstName: 'Harsh',
    lastName: 'Patel',
    email: 'harsh.patel@email.com',
    phone: '+91 98765 43210',
    country: 'India',
    countryCode: 'IN',
    avatarInitials: 'HP',
    kycStatus: 'UNDER_REVIEW',
    accountStatus: 'PENDING_KYC',
    walletBalance: '0.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    totalProfit: '0.00',
    registeredAt: '2026-08-01T08:22:00.000Z',
    investorSince: null,
    referralCode: 'GRZ-HARSH',
    occupation: 'Engineer',
    address: 'Bandra West',
    city: 'Mumbai',
    dob: '1992-03-18',
    idType: 'NATIONAL_ID',
  },
  {
    userId: 'GRZ-102441',
    username: 'saraae',
    firstName: 'Sara',
    lastName: 'Al Mansoori',
    email: 'sara.m@email.com',
    phone: '+971 50 123 4567',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    avatarInitials: 'SM',
    kycStatus: 'APPROVED',
    accountStatus: 'VERIFIED',
    walletBalance: '45200.00',
    totalDeposited: '50000.00',
    totalWithdrawn: '8000.00',
    totalProfit: '3200.00',
    registeredAt: '2025-11-02T10:00:00.000Z',
    investorSince: '2025-11-03T14:00:00.000Z',
    referralCode: 'GRZ-SARA',
    occupation: 'Founder',
    address: 'Marina Gate',
    city: 'Dubai',
    dob: '1989-11-04',
    idType: 'PASSPORT',
  },
  {
    userId: 'GRZ-103102',
    username: 'jamesuk',
    firstName: 'James',
    lastName: 'Whitfield',
    email: 'j.whitfield@email.com',
    phone: '+44 7700 900123',
    country: 'United Kingdom',
    countryCode: 'GB',
    avatarInitials: 'JW',
    kycStatus: 'REJECTED',
    accountStatus: 'REJECTED',
    walletBalance: '0.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    totalProfit: '0.00',
    registeredAt: '2026-07-20T16:40:00.000Z',
    investorSince: null,
    referralCode: 'GRZ-JAMES',
    occupation: 'Analyst',
    address: 'Canary Wharf',
    city: 'London',
    dob: '1990-01-22',
    idType: 'DRIVING_LICENSE',
  },
  {
    userId: 'GRZ-101778',
    username: 'noura92',
    firstName: 'Noura',
    lastName: 'Hassan',
    email: 'noura.h@email.com',
    phone: '+966 55 444 2211',
    country: 'Saudi Arabia',
    countryCode: 'SA',
    avatarInitials: 'NH',
    kycStatus: 'APPROVED',
    accountStatus: 'SUSPENDED',
    walletBalance: '8200.50',
    totalDeposited: '10000.00',
    totalWithdrawn: '2500.00',
    totalProfit: '700.50',
    registeredAt: '2026-01-08T09:15:00.000Z',
    investorSince: '2026-01-09T11:00:00.000Z',
    referralCode: 'GRZ-NOURA',
    city: 'Riyadh',
    idType: 'NATIONAL_ID',
  },
  {
    userId: 'GRZ-105012',
    username: 'chenwei',
    firstName: 'Wei',
    lastName: 'Chen',
    email: 'wei.chen@email.com',
    phone: '+65 8123 4567',
    country: 'Singapore',
    countryCode: 'SG',
    avatarInitials: 'WC',
    kycStatus: 'UNDER_REVIEW',
    accountStatus: 'PENDING_KYC',
    walletBalance: '0.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    totalProfit: '0.00',
    registeredAt: '2026-08-02T19:05:00.000Z',
    investorSince: null,
    referralCode: 'GRZ-CHEN',
    city: 'Singapore',
    idType: 'PASSPORT',
  },
  {
    userId: 'GRZ-100890',
    username: 'omarfx',
    firstName: 'Omar',
    lastName: 'Farooq',
    email: 'omar.f@email.com',
    phone: '+92 321 888 0099',
    country: 'Pakistan',
    countryCode: 'PK',
    avatarInitials: 'OF',
    kycStatus: 'APPROVED',
    accountStatus: 'VERIFIED',
    walletBalance: '6750.25',
    totalDeposited: '8000.00',
    totalWithdrawn: '2000.00',
    totalProfit: '750.25',
    registeredAt: '2025-09-18T07:30:00.000Z',
    investorSince: '2025-09-19T10:00:00.000Z',
    referralCode: 'GRZ-OMAR',
    city: 'Lahore',
    idType: 'PASSPORT',
  },
  {
    userId: 'GRZ-106200',
    username: 'priya88',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.s@email.com',
    phone: '+91 99887 76655',
    country: 'India',
    countryCode: 'IN',
    avatarInitials: 'PS',
    kycStatus: 'NOT_STARTED',
    accountStatus: 'PENDING_EMAIL',
    walletBalance: '0.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    totalProfit: '0.00',
    registeredAt: '2026-08-02T21:40:00.000Z',
    investorSince: null,
    referralCode: 'GRZ-PRIYA',
    city: 'Bengaluru',
  },
]

export const ADMIN_DEPOSITS: AdminDeposit[] = [
  {
    id: 'DEP-2026-884211',
    userId: 'GRZ-100001',
    amount: '500.00',
    method: 'UPI',
    reference: 'UTR4829103341',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-08-02T14:22:00.000Z',
    proofLabel: 'upi-receipt.jpg',
  },
  {
    id: 'DEP-2026-884190',
    userId: 'GRZ-102441',
    amount: '5000.00',
    method: 'Bank transfer',
    reference: 'IMPS99100221',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-08-02T11:05:00.000Z',
    proofLabel: 'bank-slip.pdf',
  },
  {
    id: 'DEP-2026-884088',
    userId: 'GRZ-100890',
    amount: '250.00',
    method: 'USDT TRC20',
    reference: '0x9f…a21c',
    status: 'NEED_INFO',
    submittedAt: '2026-08-01T22:18:00.000Z',
    proofLabel: 'tx-hash.png',
    note: 'Hash not confirmed on explorer',
  },
  {
    id: 'DEP-2026-883901',
    userId: 'GRZ-102441',
    amount: '10000.00',
    method: 'Bank transfer',
    reference: 'NEFT778812',
    status: 'APPROVED',
    submittedAt: '2026-07-28T09:40:00.000Z',
    proofLabel: 'neft-confirm.pdf',
  },
  {
    id: 'DEP-2026-883700',
    userId: 'GRZ-101778',
    amount: '1500.00',
    method: 'UPI',
    reference: 'UTR11220099',
    status: 'REJECTED',
    submittedAt: '2026-07-25T16:00:00.000Z',
    proofLabel: 'blurry-shot.jpg',
    note: 'Screenshot unreadable',
  },
  {
    id: 'DEP-2026-884301',
    userId: 'GRZ-100001',
    amount: '1000.00',
    method: 'IMPS',
    reference: 'IMPS44001992',
    status: 'PENDING',
    submittedAt: '2026-08-02T18:50:00.000Z',
    proofLabel: 'imps-proof.jpg',
  },
  {
    id: 'DEP-2026-884350',
    userId: 'GRZ-100890',
    amount: '750.00',
    method: 'UPI',
    reference: 'UTR99881122',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-08-02T20:10:00.000Z',
    proofLabel: 'gpay.jpg',
  },
]

export const ADMIN_WITHDRAWALS: AdminWithdrawal[] = [
  {
    id: 'WDR-2026-55102',
    userId: 'GRZ-100001',
    amount: '300.00',
    destination: 'Bank',
    destinationDetail: 'HDFC · ****4521',
    availableBalance: '12480.75',
    status: 'PENDING',
    requestedAt: '2026-08-02T15:40:00.000Z',
  },
  {
    id: 'WDR-2026-55088',
    userId: 'GRZ-102441',
    amount: '2000.00',
    destination: 'Crypto',
    destinationDetail: 'USDT TRC20 · TXk…9m2',
    availableBalance: '45200.00',
    status: 'PENDING',
    requestedAt: '2026-08-02T12:18:00.000Z',
  },
  {
    id: 'WDR-2026-55040',
    userId: 'GRZ-100890',
    amount: '500.00',
    destination: 'Bank',
    destinationDetail: 'HBL · ****8890',
    availableBalance: '6750.25',
    status: 'APPROVED',
    requestedAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'WDR-2026-54990',
    userId: 'GRZ-102441',
    amount: '1500.00',
    destination: 'Bank',
    destinationDetail: 'Emirates NBD · ****2201',
    availableBalance: '45200.00',
    status: 'PAID',
    requestedAt: '2026-07-29T08:30:00.000Z',
  },
  {
    id: 'WDR-2026-54910',
    userId: 'GRZ-101778',
    amount: '400.00',
    destination: 'Bank',
    destinationDetail: 'Al Rajhi · ****1102',
    availableBalance: '8200.50',
    status: 'REJECTED',
    requestedAt: '2026-07-22T19:20:00.000Z',
  },
]

export const ADMIN_RETURN_HISTORY: AdminReturnRun[] = [
  {
    id: 'RR-2026-0802',
    tradingDay: '2026-08-02',
    returnPct: '0.72',
    notes: 'Strong London session · EURUSD + GBPUSD',
    status: 'APPLIED',
    eligibleWallets: 1092,
    distributed: '19890.50',
    publishedAt: '2026-08-02T21:05:00.000Z',
    publishedBy: 'admin@growzy.com',
  },
  {
    id: 'RR-2026-0801',
    tradingDay: '2026-08-01',
    returnPct: '0.61',
    notes: 'Quiet NY open',
    status: 'APPLIED',
    eligibleWallets: 1088,
    distributed: '16840.20',
    publishedAt: '2026-08-01T21:10:00.000Z',
    publishedBy: 'admin@growzy.com',
  },
  {
    id: 'RR-2026-0731',
    tradingDay: '2026-07-31',
    returnPct: '0.74',
    notes: 'Month close push',
    status: 'APPLIED',
    eligibleWallets: 1081,
    distributed: '20112.00',
    publishedAt: '2026-07-31T21:00:00.000Z',
    publishedBy: 'ops@growzy.com',
  },
]

export const ADMIN_TRADES: AdminTrade[] = [
  {
    id: 'TRD-88401',
    tradingDay: '2026-08-02',
    pair: 'EURUSD',
    direction: 'LONG',
    entry: '1.08420',
    exit: '1.08710',
    profitPct: '0.27',
    profitUsd: '4120.00',
    notes: 'London breakout',
    publishedAt: '2026-08-02T18:40:00.000Z',
    publishedBy: 'admin@growzy.com',
  },
  {
    id: 'TRD-88402',
    tradingDay: '2026-08-02',
    pair: 'GBPUSD',
    direction: 'LONG',
    entry: '1.27540',
    exit: '1.27980',
    profitPct: '0.34',
    profitUsd: '5280.00',
    notes: 'Continuation',
    publishedAt: '2026-08-02T19:10:00.000Z',
    publishedBy: 'admin@growzy.com',
  },
  {
    id: 'TRD-88403',
    tradingDay: '2026-08-02',
    pair: 'XAUUSD',
    direction: 'SHORT',
    entry: '2412.50',
    exit: '2405.20',
    profitPct: '0.11',
    profitUsd: '1890.00',
    notes: 'Mean reversion',
    publishedAt: '2026-08-02T20:00:00.000Z',
    publishedBy: 'admin@growzy.com',
  },
  {
    id: 'TRD-88350',
    tradingDay: '2026-08-01',
    pair: 'USDJPY',
    direction: 'SHORT',
    entry: '149.820',
    exit: '149.210',
    profitPct: '0.41',
    profitUsd: '6100.00',
    notes: 'BoJ risk fade',
    publishedAt: '2026-08-01T17:30:00.000Z',
    publishedBy: 'ops@growzy.com',
  },
]

export const ADMIN_NOTIFICATIONS: AdminNotificationDraft[] = [
  {
    id: 'NTF-901',
    title: 'Daily return published',
    body: 'Today’s return of +0.72% has been credited to eligible wallets.',
    target: 'ALL',
    audienceLabel: 'All verified investors',
    channel: 'BOTH',
    createdAt: '2026-08-02T21:06:00.000Z',
    status: 'SENT',
  },
  {
    id: 'NTF-880',
    title: 'KYC reminder',
    body: 'Complete identity verification to unlock deposits.',
    target: 'SELECTED',
    audienceLabel: '18 pending KYC users',
    channel: 'EMAIL',
    createdAt: '2026-08-01T10:00:00.000Z',
    status: 'SENT',
  },
]

export const ADMIN_AUDIT: AdminAuditEntry[] = [
  {
    id: 'AUD-1',
    at: '2026-08-02T21:05:00.000Z',
    actor: 'admin@growzy.com',
    action: 'DAILY_RETURN_APPLIED',
    target: 'RR-2026-0802',
    detail: '+0.72% · $19,890.50 distributed',
  },
  {
    id: 'AUD-2',
    at: '2026-08-02T16:12:00.000Z',
    actor: 'admin@growzy.com',
    action: 'DEPOSIT_APPROVED',
    target: 'DEP-2026-883901',
    detail: '$10,000.00 credited to GRZ-102441',
  },
  {
    id: 'AUD-3',
    at: '2026-08-02T11:40:00.000Z',
    actor: 'ops@growzy.com',
    action: 'KYC_APPROVED',
    target: 'GRZ-100001',
    detail: 'Documents verified',
  },
  {
    id: 'AUD-4',
    at: '2026-08-01T19:22:00.000Z',
    actor: 'admin@growzy.com',
    action: 'WITHDRAWAL_PAID',
    target: 'WDR-2026-54990',
    detail: '$1,500.00 marked paid',
  },
]

export const ADMIN_STAFF = [
  { id: 'st1', name: 'Amina Rao', email: 'admin@growzy.com', role: 'SUPER_ADMIN', status: 'Active' },
  { id: 'st2', name: 'Omar Desk', email: 'ops@growzy.com', role: 'ADMIN', status: 'Active' },
  { id: 'st3', name: 'Compliance Lead', email: 'compliance@growzy.com', role: 'ADMIN', status: 'Active' },
] as const

export function findInvestor(userId: string) {
  return ADMIN_INVESTORS.find((i) => i.userId === userId || i.username === userId)
}

export function investorName(userId: string) {
  const i = findInvestor(userId)
  return i ? `${i.firstName} ${i.lastName}` : userId
}
