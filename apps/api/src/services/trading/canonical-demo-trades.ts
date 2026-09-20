import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { prisma } from '../../database/prisma.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { isDemoInvestor } from '../demo-investor.js'
import { mapTrade } from './trade.mappers.js'

export const HISTORICAL_TRADES_DATASET = 'wealthora-historical-trades-v1'
export const HISTORICAL_TRADES_ARCHIVE_END = '2026-08-05'

export type CanonicalDemoTrade = {
  id: string
  reference: string
  tradeDate: string
  pair: string
  direction: 'BUY' | 'SELL' | string
  strategy?: string | null
  risk?: string | null
  lotSize?: number | string | null
  entryPrice: number | string
  exitPrice?: number | string | null
  stopLoss?: number | string | null
  takeProfit?: number | string | null
  openTime?: string | null
  closeTime?: string | null
  status?: string
  outcome?: string | null
  returnPct: number | string
  pips?: number | string | null
  isPublic?: boolean
  profitAmount?: number | string | null
  lossAmount?: number | string | null
  disclosure?: string | null
  datasetVersion?: string
}

type MappedTrade = ReturnType<typeof mapCanonicalTrade>

let cached: { mtime: number; file: string; trades: CanonicalDemoTrade[] } | null = null

function candidatePaths(): string[] {
  const extra = process.env.CANONICAL_DEMO_TRADES_PATH?.trim()
  const here = path.dirname(fileURLToPath(import.meta.url))
  const cwd = process.cwd()
  return [
    extra,
    path.join(cwd, 'data/demo/trades.json'),
    path.join(cwd, 'apps/api/data/demo/trades.json'),
    path.join(cwd, '../web/public/demo/backtest/trades.json'),
    path.join(cwd, '../../apps/web/public/demo/backtest/trades.json'),
    path.resolve(here, '../../../data/demo/trades.json'),
    path.resolve(here, '../../../../apps/web/public/demo/backtest/trades.json'),
  ].filter((p): p is string => Boolean(p))
}

export function resolveCanonicalTradesPath(): string | null {
  for (const file of candidatePaths()) {
    if (fs.existsSync(file)) return file
  }
  return null
}

export function loadCanonicalDemoTrades(): CanonicalDemoTrade[] {
  const file = resolveCanonicalTradesPath()
  if (!file) return []
  const mtime = fs.statSync(file).mtimeMs
  if (cached && cached.file === file && cached.mtime === mtime) return cached.trades
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as CanonicalDemoTrade[]
  const trades = Array.isArray(parsed) ? parsed : []
  cached = { mtime, file, trades }
  return trades
}

export function mapCanonicalTrade(trade: CanonicalDemoTrade) {
  const returnPct = d(trade.returnPct ?? 0)
  const outcome =
    trade.outcome ?? (returnPct.gt(0) ? 'WIN' : returnPct.lt(0) ? 'LOSS' : 'BREAKEVEN')
  return {
    id: trade.id,
    date: String(trade.tradeDate).slice(0, 10),
    pair: trade.pair,
    direction: trade.direction === 'SELL' ? 'SELL' : 'BUY',
    entryPrice: d(trade.entryPrice).toFixed(5),
    exitPrice: trade.exitPrice != null ? d(trade.exitPrice).toFixed(5) : '0',
    stopLoss: trade.stopLoss != null ? d(trade.stopLoss).toFixed(5) : null,
    takeProfit: trade.takeProfit != null ? d(trade.takeProfit).toFixed(5) : null,
    lotSize: trade.lotSize != null ? d(trade.lotSize).toString() : null,
    returnPct: returnPct.toFixed(6),
    pips: trade.pips != null ? d(trade.pips).toString() : null,
    outcome,
    openedAt: trade.openTime ?? null,
    closedAt: trade.closeTime ?? null,
    notes: trade.disclosure ?? null,
    isPublic: trade.isPublic !== false,
    reference: trade.reference,
    status: trade.status ?? 'CLOSED',
    strategy: trade.strategy ?? null,
    risk: trade.risk ?? null,
    leverage: null as string | null,
    profitAmount: trade.profitAmount != null ? moneyDisplay(trade.profitAmount) : null,
    lossAmount: trade.lossAmount != null ? moneyDisplay(trade.lossAmount) : null,
  }
}

export function filterCanonicalTrades(opts?: {
  fromDate?: string
  outcome?: string
}) {
  let items = loadCanonicalDemoTrades()
  if (opts?.fromDate) {
    const from = opts.fromDate.slice(0, 10)
    items = items.filter((t) => String(t.tradeDate).slice(0, 10) >= from)
  }
  if (opts?.outcome) {
    items = items.filter((t) => String(t.outcome) === opts.outcome)
  }
  return items
}

function sortMapped(items: MappedTrade[]) {
  return items.sort((a, b) => {
    const date = String(b.date).localeCompare(String(a.date))
    if (date) return date
    return String(b.closedAt ?? '').localeCompare(String(a.closedAt ?? ''))
  })
}

export function paginateMapped(
  items: MappedTrade[],
  query: { cursor?: string; limit: number },
) {
  let start = 0
  if (query.cursor) {
    const idx = items.findIndex((t) => t.id === query.cursor)
    start = idx >= 0 ? idx + 1 : 0
  }
  const slice = items.slice(start, start + query.limit)
  return {
    items: slice,
    nextCursor: start + slice.length < items.length ? (slice[slice.length - 1]?.id ?? null) : null,
  }
}

export function canonicalTradeStats(items: CanonicalDemoTrade[]) {
  const closed = items.filter((t) => t.returnPct != null)
  const wins = closed.filter((t) => t.outcome === 'WIN' || d(t.returnPct).gt(0)).length
  const sum = closed.reduce((acc, t) => acc.plus(d(t.returnPct ?? 0)), d(0))
  const avg = closed.length ? sum.div(closed.length) : d(0)
  return {
    winRatePct: closed.length ? d(wins).div(closed.length).mul(100).toFixed(2) : '0.00',
    tradeCount: closed.length,
    avgReturnPct: avg.toFixed(6),
  }
}

export async function dummyTradeStartIso(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })
  const firstDeposit = await prisma.deposit.findFirst({
    where: { userId, status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })
  const stamps = [user?.createdAt, firstDeposit?.createdAt].filter((v): v is Date => Boolean(v))
  if (stamps.length === 0) return HISTORICAL_TRADES_ARCHIVE_END
  return new Date(Math.min(...stamps.map((v) => v.getTime()))).toISOString().slice(0, 10)
}

async function futureOperatorTrades(outcome?: string) {
  return prisma.trade.findMany({
    where: {
      isPublic: true,
      status: { in: ['OPEN', 'RUNNING', 'CLOSED'] },
      tradeDate: { gt: new Date(`${HISTORICAL_TRADES_ARCHIVE_END}T00:00:00.000Z`) },
      ...(outcome ? { outcome: outcome as never } : {}),
    },
    orderBy: [{ tradeDate: 'desc' }, { closeTime: 'desc' }],
  })
}

export async function listCanonicalBlotter(query: {
  cursor?: string
  outcome?: string
  limit?: number
  fromDate?: string
  allMatching?: boolean
}) {
  const archive = filterCanonicalTrades({
    fromDate: query.fromDate,
    outcome: query.outcome,
  }).map(mapCanonicalTrade)
  const future = (await futureOperatorTrades(query.outcome))
    .filter((t) => !query.fromDate || t.tradeDate.toISOString().slice(0, 10) >= query.fromDate)
    .map((t) => mapTrade(t))
  const merged = sortMapped([...archive, ...future])
  const limit = query.allMatching
    ? Math.min(Math.max(query.limit ?? 8000, 1), 8000)
    : Math.min(Math.max(query.limit ?? 50, 1), 100)
  return paginateMapped(merged, { cursor: query.cursor, limit })
}

export async function listInvestorCanonicalBlotter(
  userId: string,
  query: { cursor?: string; outcome?: string; limit?: number },
) {
  const demo = await isDemoInvestor(userId)
  if (!demo) {
    return listCanonicalBlotter(query)
  }
  const fromDate = await dummyTradeStartIso(userId)
  return listCanonicalBlotter({
    ...query,
    fromDate,
    allMatching: true,
    limit: query.limit && query.limit > 100 ? query.limit : 8000,
  })
}

export async function investorCanonicalStats(userId?: string) {
  const demo = userId ? await isDemoInvestor(userId) : false
  const fromDate = demo && userId ? await dummyTradeStartIso(userId) : undefined
  const archive = filterCanonicalTrades({ fromDate })
  if (archive.length === 0 && !fromDate) return null
  const future = await futureOperatorTrades()
  const futureAsCanonical: CanonicalDemoTrade[] = future
    .filter((t) => !fromDate || t.tradeDate.toISOString().slice(0, 10) >= fromDate)
    .map((t) => ({
      id: t.id,
      reference: t.reference,
      tradeDate: t.tradeDate.toISOString().slice(0, 10),
      pair: t.pair,
      direction: t.direction,
      entryPrice: t.entryPrice.toString(),
      exitPrice: t.exitPrice?.toString() ?? null,
      returnPct: t.returnPct?.toString() ?? '0',
      outcome: t.outcome,
      status: t.status,
    }))
  return canonicalTradeStats([...archive, ...futureAsCanonical])
}

export function findCanonicalTrade(id: string) {
  return loadCanonicalDemoTrades().find((t) => t.id === id) ?? null
}

export function canonicalPairs() {
  return [...new Set(loadCanonicalDemoTrades().map((t) => t.pair))].sort()
}
