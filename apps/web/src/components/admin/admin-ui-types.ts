/**
 * Admin console UI status / row types (pill adapters, filters).
 * Kept out of mocks so `@/lib/admin-demo-data` can be deleted later.
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

export type AdminDepositStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEED_INFO'
  | 'CANCELLED'
  | 'EXPIRED'
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
