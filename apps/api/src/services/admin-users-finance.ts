/**
 * Batch financial aggregates for Admin Users — avoids N+1 per row.
 * Totals follow product rules:
 *  - Deposits: APPROVED only (creditedAmount ?? amount)
 *  - Withdrawals: COMPLETED + PAID only
 *  - Profit: non-reversed profit distributions
 *  - Wallet balance = deposits + profit − withdrawals
 */
import type { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { d, moneyDisplay } from '../utils/money.js'
import { DEFAULT_USD_INR_RATE, inrDisplay, usdToInr } from '../utils/fx.js'
import { settingsService } from './settings.service.js'

export type UserFinanceSnapshot = {
  walletBalance: string
  availableBalance: string
  lockedBalance: string
  investedAmount: string
  totalDeposited: string
  totalWithdrawn: string
  totalProfit: string
  walletBalanceInr: string
  availableBalanceInr: string
  totalDepositedInr: string
  totalWithdrawnInr: string
  totalProfitInr: string
  usdInrRate: string
  hasWallet: boolean
  walletCount: number
}

const COMPLETED_WITHDRAWALS = ['COMPLETED', 'PAID'] as const

function emptyFinance(rate: string): UserFinanceSnapshot {
  return {
    walletBalance: '0.00',
    availableBalance: '0.00',
    lockedBalance: '0.00',
    investedAmount: '0.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    totalProfit: '0.00',
    walletBalanceInr: '0',
    availableBalanceInr: '0',
    totalDepositedInr: '0',
    totalWithdrawnInr: '0',
    totalProfitInr: '0',
    usdInrRate: rate,
    hasWallet: false,
    walletCount: 0,
  }
}

function withInr(
  usd: { deposited: string; withdrawn: string; profit: string; balance: string; available: string },
  rate: string,
  base: Omit<UserFinanceSnapshot, keyof typeof usd | 'walletBalanceInr' | 'availableBalanceInr' | 'totalDepositedInr' | 'totalWithdrawnInr' | 'totalProfitInr' | 'usdInrRate'> & {
    walletBalance: string
    availableBalance: string
    totalDeposited: string
    totalWithdrawn: string
    totalProfit: string
  },
): UserFinanceSnapshot {
  return {
    ...base,
    walletBalanceInr: inrDisplay(usdToInr(usd.balance, rate)),
    availableBalanceInr: inrDisplay(usdToInr(usd.available, rate)),
    totalDepositedInr: inrDisplay(usdToInr(usd.deposited, rate)),
    totalWithdrawnInr: inrDisplay(usdToInr(usd.withdrawn, rate)),
    totalProfitInr: inrDisplay(usdToInr(usd.profit, rate)),
    usdInrRate: rate,
  }
}

export async function loadUsdInrRate(): Promise<string> {
  try {
    const row = await settingsService.getOrInitPlatformSettings()
    const rate = row.usdInrRate ? d(row.usdInrRate) : DEFAULT_USD_INR_RATE
    return rate.gt(0) ? rate.toFixed(8) : DEFAULT_USD_INR_RATE.toFixed(8)
  } catch {
    return DEFAULT_USD_INR_RATE.toFixed(8)
  }
}

/** Aggregate finance for many users in a handful of queries. */
export async function batchUserFinance(userIds: string[]): Promise<Map<string, UserFinanceSnapshot>> {
  const map = new Map<string, UserFinanceSnapshot>()
  const rate = await loadUsdInrRate()
  if (userIds.length === 0) return map

  for (const id of userIds) map.set(id, emptyFinance(rate))

  const [wallets, deposits, withdrawals, profits] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId: { in: userIds }, kind: 'INVESTMENT' },
      select: {
        userId: true,
        balance: true,
        availableBalance: true,
        lockedBalance: true,
        investedAmount: true,
      },
    }),
    prisma.deposit.findMany({
      where: { userId: { in: userIds }, status: 'APPROVED' },
      select: { userId: true, amount: true, creditedAmount: true },
    }),
    prisma.withdrawal.findMany({
      where: { userId: { in: userIds }, status: { in: [...COMPLETED_WITHDRAWALS] } },
      select: { userId: true, amount: true, netAmount: true },
    }),
    prisma.profitDistribution.findMany({
      where: { userId: { in: userIds }, isReversed: false },
      select: { userId: true, amount: true },
    }),
  ])

  const deposited = new Map<string, ReturnType<typeof d>>()
  for (const row of deposits) {
    const amt = d(row.creditedAmount ?? row.amount)
    deposited.set(row.userId, (deposited.get(row.userId) ?? d(0)).plus(amt))
  }

  const withdrawn = new Map<string, ReturnType<typeof d>>()
  for (const row of withdrawals) {
    const amt = d(row.netAmount ?? row.amount)
    withdrawn.set(row.userId, (withdrawn.get(row.userId) ?? d(0)).plus(amt))
  }

  const profit = new Map<string, ReturnType<typeof d>>()
  for (const row of profits) {
    profit.set(row.userId, (profit.get(row.userId) ?? d(0)).plus(d(row.amount)))
  }

  const walletByUser = new Map<string, (typeof wallets)[number]>()
  const walletCounts = new Map<string, number>()
  for (const w of wallets) {
    walletByUser.set(w.userId, w)
    walletCounts.set(w.userId, (walletCounts.get(w.userId) ?? 0) + 1)
  }

  // Also count non-investment wallets for "has wallet" honesty
  const allWalletCounts = await prisma.wallet.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _count: { _all: true },
  })
  for (const row of allWalletCounts) {
    walletCounts.set(row.userId, row._count._all)
  }

  for (const id of userIds) {
    const dep = deposited.get(id) ?? d(0)
    const wd = withdrawn.get(id) ?? d(0)
    const pr = profit.get(id) ?? d(0)
    const computedBalance = dep.plus(pr).minus(wd)
    const w = walletByUser.get(id)
    const available = w ? d(w.availableBalance) : computedBalance
    const locked = w ? d(w.lockedBalance) : d(0)
    const invested = w ? d(w.investedAmount) : d(0)
    const count = walletCounts.get(id) ?? 0

    const usd = {
      deposited: moneyDisplay(dep),
      withdrawn: moneyDisplay(wd),
      profit: moneyDisplay(pr),
      balance: moneyDisplay(computedBalance),
      available: moneyDisplay(available),
    }

    map.set(
      id,
      withInr(usd, rate, {
        walletBalance: usd.balance,
        availableBalance: usd.available,
        lockedBalance: moneyDisplay(locked),
        investedAmount: moneyDisplay(invested),
        totalDeposited: usd.deposited,
        totalWithdrawn: usd.withdrawn,
        totalProfit: usd.profit,
        hasWallet: count > 0,
        walletCount: count,
      }),
    )
  }

  return map
}

export async function singleUserFinance(userId: string): Promise<UserFinanceSnapshot> {
  const map = await batchUserFinance([userId])
  return map.get(userId) ?? emptyFinance(await loadUsdInrRate())
}

export type MappedPayoutMethod = {
  id: string
  label: string
  type: string
  isDefault: boolean
  isVerified: boolean
  maskedDetails: string
  bankName?: string
  accountHolder?: string
  accountNumber?: string
  accountNumberMasked?: string
  ifsc?: string
  upi?: string
  network?: string
  address?: string
  coin?: string
  qrDataUrl?: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function maskAccount(account: string): string {
  const digits = account.replace(/\s+/g, '')
  if (digits.length <= 4) return '••••'
  return `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`
}

export function mapPayoutMethod(row: {
  id: string
  label: string
  type: string
  details: Prisma.JsonValue
  maskedDetails: string
  isDefault: boolean
  isVerified: boolean
}): MappedPayoutMethod {
  const details = asRecord(row.details)
  const accountNumber = str(details.accountNumber)
  const address = str(details.address)
  const base: MappedPayoutMethod = {
    id: row.id,
    label: row.label,
    type: row.type,
    isDefault: row.isDefault,
    isVerified: row.isVerified,
    maskedDetails: row.maskedDetails,
    bankName: str(details.bankName),
    accountHolder: str(details.accountHolderName) ?? str(details.accountHolder),
    accountNumber,
    accountNumberMasked: accountNumber ? maskAccount(accountNumber) : undefined,
    ifsc: str(details.ifscCode) ?? str(details.ifsc),
    upi: str(details.upiId) ?? str(details.upi),
    network: str(details.network),
    address,
    coin: str(details.coin),
    qrDataUrl: str(details.qrDataUrl) ?? str(details.qr) ?? null,
  }
  return base
}
