import { logger } from '../utils/logger.js'
import { scheduler } from './scheduler.js'

export type JobName =
  | 'send-email'
  | 'cleanup-expired-sessions'
  | 'cleanup-expired-tokens'
  | 'daily-return-prepare'
  | 'portfolio-snapshots'
  | 'performance-recalculate'

export interface JobPayloadMap {
  'send-email': { to: string; template: string }
  'cleanup-expired-sessions': Record<string, never>
  'cleanup-expired-tokens': Record<string, never>
  'daily-return-prepare': Record<string, never>
  'portfolio-snapshots': Record<string, never>
  'performance-recalculate': Record<string, never>
}

export interface Job<T extends JobName = JobName> {
  name: T
  payload: JobPayloadMap[T]
  enqueuedAt: string
}

type JobHandler<T extends JobName> = (payload: JobPayloadMap[T]) => Promise<void>

/**
 * In-process job runner for Phase 1.
 * Swap the implementation for Redis/BullMQ later without changing call sites.
 */
class InMemoryJobQueue {
  private readonly handlers = new Map<JobName, JobHandler<JobName>>()

  register<T extends JobName>(name: T, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<JobName>)
  }

  async enqueue<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void> {
    const job: Job<T> = {
      name,
      payload,
      enqueuedAt: new Date().toISOString(),
    }

    const handler = this.handlers.get(name)
    if (!handler) {
      logger.warn({ job }, 'No handler registered for job')
      return
    }

    try {
      await handler(payload)
      logger.info({ jobName: name }, 'Job completed')
    } catch (error) {
      logger.error({ error, jobName: name }, 'Job failed')
      throw error
    }
  }
}

export const jobQueue = new InMemoryJobQueue()

export function registerDefaultJobs(): void {
  jobQueue.register('cleanup-expired-sessions', async () => {
    logger.debug('cleanup-expired-sessions job executed')
  })
  jobQueue.register('cleanup-expired-tokens', async () => {
    logger.debug('cleanup-expired-tokens job executed')
  })
  jobQueue.register('send-email', async (payload) => {
    logger.debug({ payload }, 'send-email job executed')
  })
  jobQueue.register('daily-return-prepare', async () => {
    const { tradeService } = await import('../services/trading/trade.service.js')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    await tradeService.recomputeDailyReturn(today)
    logger.info('daily-return-prepare completed')
  })
  jobQueue.register('portfolio-snapshots', async () => {
    const { performanceService } = await import('../services/trading/performance.service.js')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    await performanceService.snapshotAllForDate(today)
    logger.info('portfolio-snapshots completed')
  })
  jobQueue.register('performance-recalculate', async () => {
    const { performanceService } = await import('../services/trading/performance.service.js')
    await performanceService.recalculateGlobal()
    logger.info('performance-recalculate completed')
  })

  // Scheduler abstraction (no BullMQ) — 24h cadence placeholders
  const dayMs = 24 * 60 * 60 * 1000
  scheduler.register('daily-return-prepare', dayMs, async () => {
    await jobQueue.enqueue('daily-return-prepare', {})
  })
  scheduler.register('portfolio-snapshots', dayMs, async () => {
    await jobQueue.enqueue('portfolio-snapshots', {})
  })
  scheduler.register('performance-recalculate', dayMs, async () => {
    await jobQueue.enqueue('performance-recalculate', {})
  })
}
