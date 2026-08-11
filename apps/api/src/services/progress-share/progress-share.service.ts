import {
  DEFAULT_DISPLAY_CURRENCY,
  isDisplayCurrency,
  type DisplayCurrency,
} from '@meridian/shared'

import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { moneyDisplay } from '../../utils/money.js'
import {
  convertFromUsdSync,
  getPlatformCurrencyRates,
} from '../finance/currency.service.js'
import { ledgerService } from '../finance/ledger.service.js'
import { mapWalletAggregate } from '../finance/finance.mappers.js'
import { performanceService } from '../trading/performance.service.js'
import { renderProgressSharePng } from './progress-share.image.js'
import {
  PROGRESS_SHARE_TTL_SECONDS,
  signProgressShareToken,
  verifyProgressShareToken,
} from './progress-share.token.js'
import type { ProgressShareLink, ProgressShareSnapshot } from './progress-share.types.js'

function displayNameFromUser(user: { firstName: string; lastName: string }): string {
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return full || 'Investor'
}

function convertUsdField(amountUsd: string, currency: DisplayCurrency, rates: Record<string, string>) {
  if (currency === 'USD') return moneyDisplay(amountUsd)
  return convertFromUsdSync(amountUsd, currency, rates)
}

/**
 * Authoritative progress snapshot for share images.
 * Uses wallet aggregate + performance summary (same Earnings Till Date source as Daily Profit email).
 * Read-only — does not write to wallets or ledger.
 */
export async function buildProgressShareSnapshot(userId: string): Promise<ProgressShareSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profile: { select: { displayCurrency: true } },
    },
  })
  if (!user) throw notFound('User not found.')

  const [wallets, rates, performance] = await Promise.all([
    ledgerService.ensureWalletsForUser(userId),
    getPlatformCurrencyRates(),
    performanceService.summary(userId),
  ])

  const wallet = mapWalletAggregate(wallets)
  const rawCurrency = user.profile?.displayCurrency ?? DEFAULT_DISPLAY_CURRENCY
  const displayCurrency: DisplayCurrency = isDisplayCurrency(rawCurrency)
    ? rawCurrency
    : DEFAULT_DISPLAY_CURRENCY

  // Earnings Till Date = investment wallet totalProfit (excludes referral rewards).
  const earningsUsd = wallet.totalProfit
  const investmentUsd = wallet.investedAmount

  return {
    displayName: displayNameFromUser(user),
    displayCurrency,
    totalInvestment: convertUsdField(investmentUsd, displayCurrency, rates),
    totalEarnings: convertUsdField(earningsUsd, displayCurrency, rates),
    earningsTillDate: convertUsdField(earningsUsd, displayCurrency, rates),
    performancePct: performance.roiPct,
    asOfDate: new Date().toISOString().slice(0, 10),
    brandName: 'Growzy Capital',
  }
}

export async function createProgressShareLink(
  userId: string,
  ttlSeconds = PROGRESS_SHARE_TTL_SECONDS,
): Promise<ProgressShareLink> {
  // Ensure user exists / snapshot is buildable before minting a link.
  await buildProgressShareSnapshot(userId)
  const { token, expiresAt } = signProgressShareToken(userId, ttlSeconds)
  const encoded = encodeURIComponent(token)
  const shareUrl = `${env.APP_URL.replace(/\/$/, '')}/progress-share?t=${encoded}`
  const imageUrl = `${env.API_URL.replace(/\/$/, '')}/api/v1/progress-share/image?t=${encoded}`
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    shareUrl,
    imageUrl,
  }
}

export async function resolveProgressShareUserId(input: {
  authenticatedUserId?: string
  token?: string
  /** Forbidden: never accept raw userId from query for authorization. */
  userIdQuery?: string
}): Promise<string> {
  if (input.userIdQuery) {
    throw badRequest('userId query parameter is not allowed for progress images.')
  }
  if (input.token) {
    return verifyProgressShareToken(input.token).userId
  }
  if (input.authenticatedUserId) {
    return input.authenticatedUserId
  }
  throw badRequest('Authentication or a valid share token is required.')
}

export async function renderProgressShareImageForUser(userId: string): Promise<{
  png: Buffer
  snapshot: ProgressShareSnapshot
}> {
  const snapshot = await buildProgressShareSnapshot(userId)
  const png = renderProgressSharePng(snapshot)
  return { png, snapshot }
}

export const progressShareService = {
  buildSnapshot: buildProgressShareSnapshot,
  createLink: createProgressShareLink,
  resolveUserId: resolveProgressShareUserId,
  renderImage: renderProgressShareImageForUser,
  verifyToken: verifyProgressShareToken,
  signToken: signProgressShareToken,
}
