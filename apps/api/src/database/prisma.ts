import { PrismaClient } from '@prisma/client'

import { env, isDevelopment } from '../config/env.js'
import { processStability } from '../observability/process-stability.js'
import { recordSystemLog } from '../observability/log-buffer.js'
import { logger } from '../utils/logger.js'
import { withRetry } from '../utils/retry.js'
import { dbCircuit } from '../utils/circuit-breaker.js'

const SLOW_QUERY_MS = 1_000

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createClient(): PrismaClient {
  const base = new PrismaClient({
    log: isDevelopment ? ['warn', 'error'] : ['error'],
  })

  // Extension: slow-query logging without relying on $on event typings.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const started = Date.now()
          try {
            return await query(args)
          } finally {
            const duration = Date.now() - started
            if (duration >= SLOW_QUERY_MS) {
              logger.warn({ durationMs: duration, model, operation }, 'Slow Prisma query')
              recordSystemLog({
                level: 'warn',
                message: `Slow query ${duration}ms · ${model}.${operation}`,
              })
            }
          }
        },
      },
    },
  }) as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export async function connectDatabase(): Promise<void> {
  await withRetry(
    () =>
      dbCircuit.exec(async () => {
        await prisma.$connect()
        await prisma.$queryRaw`SELECT 1`
      }),
    { retries: 5, minDelayMs: 500, maxDelayMs: 5_000, label: 'db-connect' },
  )
  processStability.markDbUp()
  logger.info('Database connection established')
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Database connection closed')
}

/** Soft reconnect after transient disconnect — never throws to callers. */
export async function ensureDatabase(): Promise<boolean> {
  try {
    await dbCircuit.exec(async () => {
      await prisma.$queryRaw`SELECT 1`
    })
    processStability.markDbUp()
    return true
  } catch (err) {
    processStability.markDbDown()
    logger.warn({ err }, 'Database health check failed — attempting reconnect')
    try {
      await withRetry(
        async () => {
          await prisma.$connect()
          await prisma.$queryRaw`SELECT 1`
        },
        { retries: 3, label: 'db-reconnect' },
      )
      processStability.markDbUp()
      logger.info('Database reconnected')
      return true
    } catch (reconnectErr) {
      logger.error({ err: reconnectErr }, 'Database reconnect failed')
      return false
    }
  }
}
