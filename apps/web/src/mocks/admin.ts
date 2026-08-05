/** Production stubs — empty fixtures. Prefer adminService / feature hooks for live data. */

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

export const ADMIN_STATS = {
  investors: 0,
  totalInvestors: 0,
  verifiedUsers: 0,
  aum: '0.00',
  pendingKyc: 0,
  pendingDeposits: 0,
  pendingWithdrawals: 0,
  todayReturnPct: '0',
  openTickets: 0,
}

export const ADMIN_AUM_SERIES = [] as any[]
export const ADMIN_RETURN_SERIES = [] as any[]
export const ADMIN_INVESTORS: AdminInvestor[] = []
export const ADMIN_DEPOSITS: AdminDeposit[] = []
export const ADMIN_WITHDRAWALS: AdminWithdrawal[] = []
export const ADMIN_RETURN_HISTORY: AdminReturnRun[] = []
export const ADMIN_TRADES: AdminTrade[] = []
export const ADMIN_NOTIFICATIONS: AdminNotificationDraft[] = []
export const ADMIN_AUDIT: AdminAuditEntry[] = []
export const ADMIN_STAFF = [] as Array<{ id: string; email: string; role: string }>

export function findInvestor(userId: string) {
  return ADMIN_INVESTORS.find((i) => i.userId === userId || i.username === userId)
}

export function investorName(userId: string) {
  const i = findInvestor(userId)
  return i ? `${i.firstName} ${i.lastName}` : userId
}
