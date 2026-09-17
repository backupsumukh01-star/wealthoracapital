import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './database/prisma.js'
import { registerDefaultJobs, getLocalHandlers } from './jobs/index.js'
import { createWorker, groupsForWorker, type QueueGroup } from './jobs/bullmq.js'
import type { JobName } from './jobs/types.js'
import { captureException, initSentry } from './observability/sentry.js'
import { disconnectRedis } from './services/redis/client.js'
import { logger } from './utils/logger.js'

/**
 * Dedicated BullMQ worker process.
 *
 * WORKER_GROUP: email | notifications | trading | finance | reports | scheduler | cleanup | all
 * WORKER_CONCURRENCY: parallel jobs per queue (default 4)
 */
async function bootstrap(): Promise<void> {
  await initSentry()

  if (env.JOB_DRIVER !== 'bullmq' || !env.REDIS_URL) {
    logger.warn('Worker started but JOB_DRIVER is not bullmq or REDIS_URL missing — exiting')
    process.exit(0)
  }

  registerDefaultJobs()
  await connectDatabase()

  const group = process.env.WORKER_GROUP || 'all'
  const handlers = getLocalHandlers()
  const groups = groupsForWorker(group)

  const workers = groups
    .map((g: QueueGroup) =>
      createWorker(g, async (name: JobName, payload: unknown) => {
        const handler = handlers.getHandler(name)
        if (!handler) {
          logger.warn({ name, group: g }, 'No local handler for job')
          return
        }
        await handler(payload as never)
      }),
    )
    .filter(Boolean)

  if (workers.length === 0) {
    logger.error('No workers started — Redis connection failed')
    process.exit(1)
  }

  logger.info({ group, queues: groups.length }, 'Wealthora workers ready')

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down worker')
    await Promise.all(workers.map((w) => w!.close()))
    await disconnectDatabase()
    await disconnectRedis()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection in worker')
    captureException(reason)
  })
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception in worker')
    captureException(error)
    void shutdown('uncaughtException')
  })
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, 'Worker failed to start')
  process.exit(1)
})
