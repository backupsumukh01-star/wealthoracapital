import type {
  DailyReturn,
  DailyReturnRun,
  ProfitDistribution,
  Trade,
  TradeOutcome,
} from '@prisma/client'

import { d, moneyDisplay, type Decimal } from '../../utils/money.js'

function pct(value: string | number | null | undefined): string {
  if (value == null) return '0.000000'
  return d(value).toFixed(6)
}

function outcomeFromReturn(returnPct: string | number | null): TradeOutcome | null {
  if (returnPct == null) return null
  const v = d(returnPct)
  if (v.gt(0)) return 'WIN'
  if (v.lt(0)) return 'LOSS'
  return 'BREAKEVEN'
}

/** Investor/admin Trade DTO matching `@meridian/shared`. */
export function mapTrade(trade: Trade) {
  const outcome = trade.outcome ?? outcomeFromReturn(trade.returnPct?.toString() ?? null)
  return {
    id: trade.id,
    date: trade.tradeDate.toISOString().slice(0, 10),
    pair: trade.pair,
    direction: trade.direction,
    entryPrice: d(trade.entryPrice).toFixed(5),
    exitPrice: trade.exitPrice != null ? d(trade.exitPrice).toFixed(5) : '0',
    stopLoss: trade.stopLoss != null ? d(trade.stopLoss).toFixed(5) : null,
    takeProfit: trade.takeProfit != null ? d(trade.takeProfit).toFixed(5) : null,
    lotSize: trade.lotSize != null ? d(trade.lotSize).toString() : null,
    returnPct: pct(trade.returnPct?.toString() ?? null),
    pips: trade.pips != null ? d(trade.pips).toString() : null,
    outcome: outcome ?? 'BREAKEVEN',
    openedAt: trade.openTime?.toISOString() ?? null,
    closedAt: trade.closeTime?.toISOString() ?? null,
    notes: trade.adminNotes,
    isPublic: trade.isPublic,
    // Extended admin fields (ignored by strict frontend Trade type consumers)
    reference: trade.reference,
    status: trade.status,
    strategy: trade.strategy,
    risk: trade.risk,
    leverage: trade.leverage != null ? d(trade.leverage).toString() : null,
    profitAmount: trade.profitAmount != null ? moneyDisplay(trade.profitAmount) : null,
    lossAmount: trade.lossAmount != null ? moneyDisplay(trade.lossAmount) : null,
  }
}

export function mapDailyReturn(day: DailyReturn) {
  return {
    id: day.id,
    date: day.date.toISOString().slice(0, 10),
    status: day.status,
    netReturnPct: day.netReturnPct != null ? pct(day.netReturnPct.toString()) : null,
    computedReturnPct: day.computedReturnPct != null ? pct(day.computedReturnPct.toString()) : null,
    tradeCount: day.tradeCount,
    winCount: day.winCount,
    lossCount: day.lossCount,
    summary: day.summary,
  }
}

export function mapDailyReturnRun(run: DailyReturnRun) {
  return {
    id: run.id,
    date: run.date.toISOString().slice(0, 10),
    returnPct: pct(run.returnPct.toString()),
    returnBasis: run.returnBasis,
    status: run.status,
    eligibleWallets: run.eligibleWallets,
    processedWallets: run.processedWallets,
    totalBaseAmount: moneyDisplay(run.totalBaseAmount),
    totalDistributed: moneyDisplay(run.totalDistributed),
    roundingDelta: moneyDisplay(run.roundingDelta),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
  }
}

export function mapProfitDistribution(row: ProfitDistribution) {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    eligibleBalance: moneyDisplay(row.eligibleBalance),
    returnPct: pct(row.returnPct.toString()),
    grossAmount: moneyDisplay(row.grossAmount),
    amount: moneyDisplay(row.amount),
    balanceAfter: moneyDisplay(row.balanceAfter),
    isReversed: row.isReversed,
    createdAt: row.createdAt.toISOString(),
  }
}

export function suggestedReturnPct(
  direction: 'BUY' | 'SELL',
  entry: string | number | Decimal,
  exit: string | number | Decimal,
) {
  const e = d(entry)
  const x = d(exit)
  if (e.lte(0)) return d(0)
  const raw = direction === 'BUY' ? x.minus(e).div(e).mul(100) : e.minus(x).div(e).mul(100)
  return raw.toDecimalPlaces(6)
}
