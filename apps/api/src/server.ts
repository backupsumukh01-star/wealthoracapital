import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './database/prisma.js'
import { DEFAULT_EMAIL_TEMPLATES } from './emails/default-templates.js'
import { registerDefaultJobs } from './jobs/index.js'
import { scheduler } from './jobs/scheduler.js'
import { captureException, initSentry } from './observability/sentry.js'
import { processStability } from './observability/process-stability.js'
import { recordSystemLog } from './observability/log-buffer.js'
import { emailTemplateService } from './services/email/email-template.service.js'
import { disconnectRedis } from './services/redis/client.js'
import { ensureUploadRoot } from './services/storage/ensure-upload-root.js'
import { logger } from './utils/logger.js'

async function bootstrap(): Promise<void> {
  processStability.boot()
  await initSentry()
  registerDefaultJobs()
  await connectDatabase()
  await ensureUploadRoot()

  try {
    await emailTemplateService.ensureSeeded(DEFAULT_EMAIL_TEMPLATES)
  } catch (error) {
    logger.error({ error }, 'Failed to seed default email templates')
    captureException(error)
  }

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        apiUrl: env.API_URL,
        jobDriver: env.JOB_DRIVER,
        cacheDriver: env.CACHE_DRIVER,
        storageDriver: env.STORAGE_DRIVER,
        uploadRoot: env.STORAGE_DRIVER === 'local' ? env.UPLOAD_ROOT : undefined,
        requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
      },
      'Wealthora API listening',
    )
    recordSystemLog({
      level: 'info',
      message: 'API process started',
      meta: processStability.snapshot(),
    })
  })

  // Avoid hanging sockets after idle clients (Render / LB friendly)
  server.keepAliveTimeout = 65_000
  server.headersTimeout = 70_000
  server.requestTimeout = env.REQUEST_TIMEOUT_MS > 0 ? env.REQUEST_TIMEOUT_MS + 5_000 : 0

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    logger.info({ signal }, 'Graceful shutdown started')
    recordSystemLog({ level: 'info', message: `Graceful shutdown: ${signal}` })

    // Stop accepting new work from in-process crons
    try {
      scheduler.unregisterAll()
    } catch {
      // ignore
    }

    server.close(async (error) => {
      if (error) {
        logger.error({ error }, 'Error while closing HTTP server')
      }
      try {
        await disconnectDatabase()
        await disconnectRedis()
      } catch (disconnectError) {
        logger.error({ error: disconnectError }, 'Error while disconnecting')
      }
      process.exit(error ? 1 : 0)
    })

    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
    captureException(reason)
    void import('./services/stability-monitor.service.js').then(({ stabilityMonitorService }) =>
      stabilityMonitorService.notifyUnhandled('unhandledRejection', reason),
    )
    // Do NOT exit — isolate the failure; Express and jobs must keep serving.
  })

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception')
    captureException(error)
    void import('./services/stability-monitor.service.js').then(({ stabilityMonitorService }) =>
      stabilityMonitorService.notifyUnhandled('uncaughtException', error),
    )
    if (env.EXIT_ON_UNCAUGHT) {
      // Controlled exit so Render restarts a clean process (self-heal at platform layer).
      void shutdown('uncaughtException')
    } else {
      // Stay alive for request-serving; admin is alerted. Prefer EXIT_ON_UNCAUGHT=true in prod
      // once monitoring confirms restarts are healthy.
      logger.fatal('Continuing after uncaughtException (EXIT_ON_UNCAUGHT=false)')
    }
  })
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, 'Failed to start API')
  process.exit(1)
})
