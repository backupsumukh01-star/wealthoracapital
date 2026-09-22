import { prisma } from '../../database/prisma.js'
import { d, moneyDisplay } from '../../utils/money.js'

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function utcDayDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

export type DemoShareReturn = {
  /** Programme / historical return % for display only. */
  dailyReturnPct: string
  /**
   * Optional display-only earnings for the poster when the demo user has no
   * today ProfitDistribution. Never written to ledger/wallet.
   */
  displayTodayEarnings: string | null
  source: 'daily_return' | 'historical_profit' | 'none'
}

/**
 * Resolve Daily Return for admin-created (dummy/demo) investors for Progress Share.
 *
 * Sources (read-only, no ledger writes):
 * 1) Platform DailyReturn for today (netReturnPct ?? computedReturnPct)
 * 2) Demo user's most recent ProfitDistribution (historical import)
 * 3) none → 0.00
 *
 * Live Daily Return runs already exclude demo users via realInvestorUser.
 */
export async function resolveDemoShareDailyReturn(
  userId: string,
  availableBalance: string,
  asOfDate = utcDayKey(),
): Promise<DemoShareReturn> {
  const day = await prisma.dailyReturn.findUnique({
    where: { date: utcDayDate(asOfDate) },
    select: { netReturnPct: true, computedReturnPct: true },
  })
  const programmePct = day?.netReturnPct ?? day?.computedReturnPct
  if (programmePct != null && d(programmePct).isFinite()) {
    const pct = d(programmePct)
    const balance = d(availableBalance)
    const displayEarnings =
      balance.isFinite() && balance.gt(0) && pct.isFinite()
        ? moneyDisplay(balance.mul(pct).div(100).toDecimalPlaces(2))
        : null
    return {
      dailyReturnPct: pct.toFixed(6),
      displayTodayEarnings: displayEarnings,
      source: 'daily_return',
    }
  }

  const latest = await prisma.profitDistribution.findFirst({
    where: { userId, isReversed: false },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { returnPct: true },
  })
  if (latest) {
    return {
      dailyReturnPct: d(latest.returnPct).toFixed(6),
      displayTodayEarnings: null,
      source: 'historical_profit',
    }
  }

  return { dailyReturnPct: '0.00', displayTodayEarnings: null, source: 'none' }
}
