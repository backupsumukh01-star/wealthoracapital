#!/usr/bin/env node
/**
 * Import the 3-year demo/backtest JSON into the database (trades + daily_returns).
 *
 * Usage (from apps/api, with DATABASE_URL set):
 *   pnpm db:seed:demo
 *   # or
 *   tsx scripts/seed-demo-backtest.mjs
 *
 * Data sources (first match wins):
 *   1. demo-data/3-year-backtest/export/json/{trades,daily_returns}.json
 *   2. apps/web/public/demo/backtest/{trades,daily_returns}.json
 *
 * DailyReturn.status is forced to PUBLISHED (TradingDayStatus: DRAFT | PUBLISHED |
 * DISTRIBUTED | REVERSED — never SETTLED).
 * Trade.status is forced to CLOSED with isPublic=true.
 *
 * Do not run against production unless you intentionally want demo history there.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(API_ROOT, '../..')

loadDotenv({ path: path.join(API_ROOT, '.env') })
loadDotenv({ path: path.join(REPO_ROOT, '.env') })

const BATCH = 100

function resolveDataDir() {
  const candidates = [
    path.join(REPO_ROOT, 'demo-data/3-year-backtest/export/json'),
    path.join(REPO_ROOT, 'apps/web/public/demo/backtest'),
  ]
  for (const dir of candidates) {
    const trades = path.join(dir, 'trades.json')
    const days = path.join(dir, 'daily_returns.json')
    if (fs.existsSync(trades) && fs.existsSync(days)) {
      return dir
    }
  }
  throw new Error(
    `Could not find trades.json + daily_returns.json in:\n${candidates.map((c) => `  - ${c}`).join('\n')}`,
  )
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function parseDateOnly(value) {
  // Prisma @db.Date expects a Date at UTC midnight
  const s = String(value).slice(0, 10)
  return new Date(`${s}T00:00:00.000Z`)
}

function parseDateTime(value) {
  if (!value) return null
  return new Date(value)
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function mapDailyReturn(row) {
  return {
    id: row.id,
    date: parseDateOnly(row.date),
    // Schema TradingDayStatus — never SETTLED
    status: 'PUBLISHED',
    computedReturnPct: row.computedReturnPct ?? null,
    netReturnPct: row.netReturnPct ?? null,
    tradeCount: row.tradeCount ?? 0,
    winCount: row.winCount ?? 0,
    lossCount: row.lossCount ?? 0,
    summary: row.summary ?? null,
  }
}

function mapTrade(row) {
  return {
    id: row.id,
    reference: row.reference,
    pair: row.pair,
    direction: row.direction,
    strategy: row.strategy ?? null,
    risk: row.risk ?? 'MEDIUM',
    lotSize: row.lotSize ?? null,
    entryPrice: row.entryPrice,
    exitPrice: row.exitPrice ?? null,
    stopLoss: row.stopLoss ?? null,
    takeProfit: row.takeProfit ?? null,
    openTime: parseDateTime(row.openTime),
    closeTime: parseDateTime(row.closeTime),
    tradeDate: parseDateOnly(row.tradeDate),
    status: 'CLOSED',
    outcome: row.outcome ?? null,
    profitAmount: row.profitAmount ?? null,
    lossAmount: row.lossAmount ?? null,
    returnPct: row.returnPct ?? null,
    pips: row.pips ?? null,
    isPublic: true,
    settledAt: parseDateTime(row.closeTime) ?? parseDateTime(row.settledAt),
  }
}

async function upsertDailyReturns(prisma, rows) {
  let n = 0
  for (const batch of chunk(rows, BATCH)) {
    await prisma.$transaction(
      batch.map((row) => {
        const data = mapDailyReturn(row)
        return prisma.dailyReturn.upsert({
          where: { id: data.id },
          create: data,
          update: {
            date: data.date,
            status: data.status,
            computedReturnPct: data.computedReturnPct,
            netReturnPct: data.netReturnPct,
            tradeCount: data.tradeCount,
            winCount: data.winCount,
            lossCount: data.lossCount,
            summary: data.summary,
          },
        })
      }),
    )
    n += batch.length
    process.stdout.write(`\r  daily_returns: ${n}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function upsertTrades(prisma, rows) {
  let n = 0
  for (const batch of chunk(rows, BATCH)) {
    await prisma.$transaction(
      batch.map((row) => {
        const data = mapTrade(row)
        return prisma.trade.upsert({
          where: { id: data.id },
          create: data,
          update: {
            reference: data.reference,
            pair: data.pair,
            direction: data.direction,
            strategy: data.strategy,
            risk: data.risk,
            lotSize: data.lotSize,
            entryPrice: data.entryPrice,
            exitPrice: data.exitPrice,
            stopLoss: data.stopLoss,
            takeProfit: data.takeProfit,
            openTime: data.openTime,
            closeTime: data.closeTime,
            tradeDate: data.tradeDate,
            status: data.status,
            outcome: data.outcome,
            profitAmount: data.profitAmount,
            lossAmount: data.lossAmount,
            returnPct: data.returnPct,
            pips: data.pips,
            isPublic: true,
            settledAt: data.settledAt,
          },
        })
      }),
    )
    n += batch.length
    process.stdout.write(`\r  trades: ${n}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy apps/api/.env.example → apps/api/.env or export it.')
    console.error('See demo-data/3-year-backtest/IMPORT_TO_DATABASE.md for Render URL steps.')
    process.exit(1)
  }

  const dataDir = resolveDataDir()
  const dailyReturns = readJson(path.join(dataDir, 'daily_returns.json'))
  const trades = readJson(path.join(dataDir, 'trades.json'))

  if (!Array.isArray(dailyReturns) || !Array.isArray(trades)) {
    throw new Error('Expected daily_returns.json and trades.json to be JSON arrays')
  }

  const tradesOnly = process.env.HISTORICAL_TRADES_ONLY === '1' || process.argv.includes('--trades-only')

  console.log(`Data dir: ${dataDir}`)
  if (tradesOnly) {
    console.log(`Importing ${trades.length} trades only (daily_returns skipped — profit dataset is frozen).`)
  } else {
    console.log(`Importing ${dailyReturns.length} daily_returns (status=PUBLISHED) + ${trades.length} trades (status=CLOSED, isPublic=true)…`)
  }

  const prisma = new PrismaClient()
  try {
    if (!tradesOnly) {
      await upsertDailyReturns(prisma, dailyReturns)
    }
    await upsertTrades(prisma, trades)
    console.log(tradesOnly ? 'Done. Historical trades upserted (idempotent).' : 'Done. Demo backtest rows upserted.')
  } finally {
    await prisma.$disconnect()
  }
}

try {
  await main()
} catch (err) {
  console.error(err instanceof Error ? err.stack || err.message : err)
  process.exit(1)
}
