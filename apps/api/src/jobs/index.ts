import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { BullmqJobQueue } from './bullmq-queue.js'
import { registerRepeatableJobs } from './bullmq.js'
import { InMemoryJobQueue } from './memory-queue.js'
import { scheduler } from './scheduler.js'
import type { JobName, JobPayloadMap, JobQueueDriver } from './types.js'

export type { JobName, JobPayloadMap, Job } from './types.js'

const memoryQueue = new InMemoryJobQueue()

function createJobQueue(): JobQueueDriver {
  if (env.JOB_DRIVER === 'bullmq' && env.REDIS_URL) {
    logger.info('Using BullMQ job driver')
    return new BullmqJobQueue(memoryQueue)
  }
  logger.info('Using in-memory job driver')
  return memoryQueue
}

export const jobQueue = createJobQueue()

/** Expose memory handlers for dedicated worker processes. */
export function getLocalHandlers() {
  return memoryQueue
}

export function registerDefaultJobs(): void {
  jobQueue.register('cleanup-expired-sessions', async () => {
    const { prisma } = await import('../database/prisma.js')
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    logger.info({ deleted: result.count }, 'cleanup-expired-sessions completed')
  })
  jobQueue.register('cleanup-expired-tokens', async () => {
    const { prisma } = await import('../database/prisma.js')
    const result = await prisma.verificationToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    })
    logger.info({ deleted: result.count }, 'cleanup-expired-tokens completed')
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
  jobQueue.register('email-outbox-process', async () => {
    const { emailOutboxService } = await import('../services/email/email-outbox.service.js')
    const result = await emailOutboxService.processQueue()
    logger.info({ result }, 'email-outbox-process completed')
  })
  jobQueue.register('cms-scheduled-publish', async () => {
    const { cmsService } = await import('../services/cms/cms.service.js')
    const count = await cmsService.processScheduledPublishes()
    if (count > 0) logger.info({ count }, 'cms-scheduled-publish completed')
  })
  jobQueue.register('broadcast-scheduled-send', async () => {
    const { broadcastService } = await import('../services/broadcast.service.js')
    const count = await broadcastService.processScheduled()
    if (count > 0) logger.info({ count }, 'broadcast-scheduled-send completed')
  })
  jobQueue.register('generate-report', async (payload) => {
    logger.info({ payload }, 'generate-report job placeholder')
  })
  jobQueue.register('send-notification', async (payload) => {
    const { notificationService } = await import('../services/notification.service.js')
    await notificationService.notify({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
    })
  })

  if (env.JOB_DRIVER === 'bullmq' && env.REDIS_URL) {
    void registerRepeatableJobs().catch((error) => {
      logger.warn({ error }, 'Failed to register BullMQ repeatable jobs; using in-process scheduler')
      registerInProcessScheduler()
    })
  } else {
    registerInProcessScheduler()
  }
}

function registerInProcessScheduler(): void {
  const dayMs = 24 * 60 * 60 * 1000
  const minuteMs = 60 * 1000
  const hourMs = 60 * 60 * 1000

  const schedule = (name: JobName, intervalMs: number) => {
    scheduler.register(name, intervalMs, async () => {
      await jobQueue.enqueue(name, {} as JobPayloadMap[typeof name])
    })
  }

  schedule('daily-return-prepare', dayMs)
  schedule('portfolio-snapshots', dayMs)
  schedule('performance-recalculate', dayMs)
  schedule('email-outbox-process', minuteMs)
  schedule('cms-scheduled-publish', minuteMs)
  schedule('broadcast-scheduled-send', minuteMs)
  schedule('cleanup-expired-sessions', hourMs)
  schedule('cleanup-expired-tokens', hourMs)
}
