import { DEFAULT_DISPLAY_CURRENCY, type DisplayCurrency } from '@meridian/shared'

import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { ledgerService } from '../finance/ledger.service.js'
import { mapWalletAggregate } from '../finance/finance.mappers.js'
import { performanceService } from '../trading/performance.service.js'
import { renderProgressSharePng } from './progress-share.image.js'
import { thinRealPoints } from './progress-share.chart.js'
import {
  PROGRESS_SHARE_TTL_SECONDS,
  signProgressShareToken,
  verifyProgressShareToken,
} from './progress-share.token.js'
import type {
  ProgressShareKind,
  ProgressShareLink,
  ProgressShareSnapshot,
} from './progress-share.types.js'

/** Browser / privacy placeholders that should not appear on share cards. */
const PLACEHOLDER_TOKEN =
  /^(unknown|user|investor|incognito|anonymous|guest|n\/?a|null|undefined|test)$/i
const PLACEHOLDER_PHRASE =
  /^(unknown(\s+|[-_])+incognito|anonymous(\s+|[-_])+user|test(\s+|[-_])+user)$/i

function isUsableNamePart(value: string | null | undefined): value is string {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 && !PLACEHOLDER_TOKEN.test(trimmed)
}

/**
 * Share-card display name priority:
 * 1) first + last (display name; skipping placeholder tokens)
 * 2) email local-part as username
 * 3) "Investor"
 */
export function displayNameFromUser(user: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}): string {
  const parts = [user.firstName, user.lastName].filter(isUsableNamePart)
  const joined = parts.join(' ').trim()
  if (joined && !PLACEHOLDER_PHRASE.test(joined)) return joined

  const local = user.email?.split('@')[0]?.trim()
  if (local && local.length >= 2 && !PLACEHOLDER_TOKEN.test(local)) {
    return local.slice(0, 40)
  }

  return 'Investor'
}

/**
 * Authoritative progress snapshot for share images.
 * Uses wallet aggregate + performance summary (same Earnings Till Date source as Daily Profit email).
 * Read-only — does not write to wallets or ledger.
 * Amounts are the USD ledger figures; share cards do not convert display currencies.
 */
export async function buildProgressShareSnapshot(userId: string): Promise<ProgressShareSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  })
  if (!user) throw notFound('User not found.')

  const [wallets, performance, equity, todayRows] = await Promise.all([
    ledgerService.ensureWalletsForUser(userId),
    performanceService.summary(userId),
    performanceService.series(userId, 'all'),
    prisma.profitDistribution.findMany({
      where: {
        userId,
        isReversed: false,
        date: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
      },
      orderBy: { createdAt: 'asc' },
      select: { amount: true, returnPct: true, createdAt: true },
    }),
  ])

  const wallet = mapWalletAggregate(wallets)
  const displayCurrency: DisplayCurrency = DEFAULT_DISPLAY_CURRENCY

  const earningsUsd = wallet.totalProfit
  const investmentUsd = wallet.investedAmount
  const currentUsd = wallet.balance

  let todayEarnings = d(0)
  for (const row of todayRows) todayEarnings = todayEarnings.plus(d(row.amount))
  const latestToday = todayRows[todayRows.length - 1]
  const dailyReturnPct = latestToday ? d(latestToday.returnPct).toFixed(6) : '0.00'

  const history = thinRealPoints(
    equity.points.map((p) => ({ label: p.date, value: p.balance })),
  )
  const portfolioHistory =
    history.length >= 2
      ? history
      : [
          { label: 'STARTED', value: investmentUsd },
          { label: 'NOW', value: currentUsd },
        ]

  const intradayPerformance =
    todayRows.length >= 2
      ? (() => {
          let cum = d(0)
          return todayRows.map((row) => {
            cum = cum.plus(d(row.amount))
            return {
              label: row.createdAt.toISOString().slice(11, 16),
              value: moneyDisplay(cum),
            }
          })
        })()
      : []

  return {
    displayName: displayNameFromUser(user),
    displayCurrency,
    totalInvestment: moneyDisplay(investmentUsd),
    totalEarnings: moneyDisplay(earningsUsd),
    earningsTillDate: moneyDisplay(earningsUsd),
    currentValue: moneyDisplay(currentUsd),
    performancePct: performance.roiPct,
    todayEarnings: moneyDisplay(todayEarnings),
    dailyReturnPct,
    asOfDate: new Date().toISOString().slice(0, 10),
    brandName: 'Wealthora Capital',
    portfolioHistory,
    intradayPerformance,
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
  const shareBase = `${env.APP_URL.replace(/\/$/, '')}/progress-share?t=${encoded}`
  const imageBase = `${env.API_URL.replace(/\/$/, '')}/api/v1/progress-share/image?t=${encoded}`
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    shareUrl: shareBase,
    imageUrl: `${imageBase}&kind=journey`,
    journeyImageUrl: `${imageBase}&kind=journey`,
    dailyImageUrl: `${imageBase}&kind=daily`,
    journeyShareUrl: `${shareBase}&kind=journey`,
    dailyShareUrl: `${shareBase}&kind=daily`,
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

export async function renderProgressShareImageForUser(
  userId: string,
  kind: ProgressShareKind = 'journey',
): Promise<{
  png: Buffer
  snapshot: ProgressShareSnapshot
}> {
  const snapshot = await buildProgressShareSnapshot(userId)
  const png = renderProgressSharePng(snapshot, kind)
  return { png, snapshot }
}

export const progressShareService = {
  buildSnapshot: buildProgressShareSnapshot,
  createLink: createProgressShareLink,
  resolveUserId: resolveProgressShareUserId,
  renderImage: renderProgressShareImageForUser,
  verifyToken: verifyProgressShareToken,
  signToken: signProgressShareToken,
  displayNameFromUser,
}
