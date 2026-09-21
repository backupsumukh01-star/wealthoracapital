import {
  DEPOSIT_LOCK_DAYS_DEFAULT,
  DEFAULT_CURRENCY_RATES,
  DISPLAY_CURRENCIES,
  convertFromUsd,
  isDisplayCurrency,
  normalizeCurrencyRates,
  type CurrencyRatesMap,
  type DisplayCurrency,
} from '@meridian/shared'

import { prisma } from '../../database/prisma.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { settingsService } from '../settings.service.js'
import type { Prisma } from '@prisma/client'

export {
  DEPOSIT_LOCK_DAYS_DEFAULT,
  DEFAULT_CURRENCY_RATES,
  DISPLAY_CURRENCIES,
  convertFromUsd,
  isDisplayCurrency,
  normalizeCurrencyRates,
}
export type { CurrencyRatesMap, DisplayCurrency }

export function parseCurrencyRatesJson(value: Prisma.JsonValue | null | undefined): CurrencyRatesMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: CurrencyRatesMap = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' || typeof raw === 'number') out[key] = String(raw)
  }
  return out
}

export async function getPlatformCurrencyRates(): Promise<Record<DisplayCurrency, string>> {
  const platform = await settingsService.getOrInitPlatformSettings()
  const fromJson = parseCurrencyRatesJson(platform.currencyRates)
  // Keep legacy usdInrRate as source of truth for INR when present.
  if (platform.usdInrRate != null) {
    fromJson.INR = d(platform.usdInrRate).toFixed()
  }
  return normalizeCurrencyRates(fromJson)
}

export function convertFromUsdSync(
  amountUsd: string | number,
  targetCurrency: string,
  rates: CurrencyRatesMap,
): string {
  return convertFromUsd(amountUsd, targetCurrency, rates)
}

/** Compute unlock timestamp from approval instant + lock days. */
export function computeFundsUnlockAt(approvedAt: Date, lockDays = DEPOSIT_LOCK_DAYS_DEFAULT): Date {
  const days = Number.isFinite(lockDays) && lockDays > 0 ? Math.floor(lockDays) : DEPOSIT_LOCK_DAYS_DEFAULT
  const unlock = new Date(approvedAt.getTime())
  unlock.setUTCDate(unlock.getUTCDate() + days)
  return unlock
}

export type DepositRail = 'INR' | 'CRYPTO' | 'OTHER'

/**
 * USD-only product mode (INR/Bank/UPI gateways are not enabled).
 * Investor amounts stay USD; historical deposit rails are retained in the
 * database but must not constrain which enabled payout method may be used.
 * Flip this to false when INR payout rails are officially launched.
 */
export const USD_ONLY_WITHDRAWAL_MODE = true

/** When false, latest deposit rail does not have to match payout rail. */
export function depositRailConstrainsPayoutRail(): boolean {
  return !USD_ONLY_WITHDRAWAL_MODE
}

export function depositRailFromPaymentType(type: string): DepositRail {
  if (['UPI', 'BANK_TRANSFER', 'MOBILE_WALLET'].includes(type)) return 'INR'
  if (['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)) return 'CRYPTO'
  return 'OTHER'
}

export function payoutRailFromType(type: string): DepositRail {
  return depositRailFromPaymentType(type)
}

const INR_RAIL_MISMATCH_MESSAGE =
  'Your latest deposit used a bank/UPI payment method. Withdrawals must use the corresponding payout method.'
const CRYPTO_RAIL_MISMATCH_MESSAGE =
  'Your latest deposit was via crypto. Withdrawals must use a crypto payout method.'

/**
 * Deposit-rail → payout-rail mismatch, if any, under the current product mode.
 * Returns null in USD-only mode so historical INR/CRYPTO deposits cannot block
 * an otherwise valid USD crypto withdrawal.
 */
export function withdrawalRailMismatchError(
  latestRail: DepositRail | null | undefined,
  payoutMethodType: string,
): { message: string; requiredRail: DepositRail; payoutRail: DepositRail } | null {
  if (!depositRailConstrainsPayoutRail()) return null
  if (!latestRail || (latestRail !== 'INR' && latestRail !== 'CRYPTO')) return null
  const payoutRail = payoutRailFromType(payoutMethodType)
  if (payoutRail === latestRail) return null
  return {
    message: latestRail === 'CRYPTO' ? CRYPTO_RAIL_MISMATCH_MESSAGE : INR_RAIL_MISMATCH_MESSAGE,
    requiredRail: latestRail,
    payoutRail,
  }
}

/**
 * Latest qualifying (APPROVED) deposit rail for withdrawal matching.
 * Returns null when the user has no approved deposits yet.
 */
export async function getLatestQualifyingDepositRail(userId: string): Promise<{
  rail: DepositRail
  depositId: string
  paymentMethodType: string
} | null> {
  const deposit = await prisma.deposit.findFirst({
    where: { userId, status: 'APPROVED' },
    orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
    include: { paymentMethod: { select: { type: true } } },
  })
  if (!deposit) return null
  return {
    rail: depositRailFromPaymentType(deposit.paymentMethod.type),
    depositId: deposit.id,
    paymentMethodType: deposit.paymentMethod.type,
  }
}

export type WithdrawalEligibility = {
  availableBalance: string
  lockedAmount: string
  eligibleAmount: string
  nextUnlockAt: string | null
  lockedDepositCount: number
}

/**
 * eligible = max(0, availableBalance − sum(credited of APPROVED deposits still locked)).
 * Legacy approved deposits with null fundsUnlockAt are treated as unlocked.
 */
export async function getWithdrawalEligibility(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<WithdrawalEligibility> {
  const db = tx ?? prisma
  const wallet = await db.wallet.findFirst({
    where: { userId, kind: 'INVESTMENT' },
  })
  const available = d(wallet?.availableBalance ?? 0)
  const now = new Date()

  const lockedDeposits = await db.deposit.findMany({
    where: {
      userId,
      status: 'APPROVED',
      fundsUnlockAt: { gt: now },
    },
    select: {
      creditedAmount: true,
      amount: true,
      fundsUnlockAt: true,
    },
    orderBy: { fundsUnlockAt: 'asc' },
  })

  let locked = d(0)
  for (const row of lockedDeposits) {
    locked = locked.plus(d(row.creditedAmount ?? row.amount))
  }

  const eligible = DecimalMax(available.minus(locked), d(0))
  const nextUnlockAt = lockedDeposits[0]?.fundsUnlockAt?.toISOString() ?? null

  return {
    availableBalance: moneyDisplay(available),
    lockedAmount: moneyDisplay(locked),
    eligibleAmount: moneyDisplay(eligible),
    nextUnlockAt,
    lockedDepositCount: lockedDeposits.length,
  }
}

function DecimalMax(a: ReturnType<typeof d>, b: ReturnType<typeof d>) {
  return a.gte(b) ? a : b
}
