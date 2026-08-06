import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './database/prisma.js'
import { DEFAULT_EMAIL_TEMPLATES } from './emails/default-templates.js'
import { registerDefaultJobs } from './jobs/index.js'
import { captureException, initSentry } from './observability/sentry.js'
import { emailTemplateService } from './services/email/email-template.service.js'
import { disconnectRedis } from './services/redis/client.js'
import { ensureUploadRoot } from './services/storage/ensure-upload-root.js'
import { logger } from './utils/logger.js'

async function bootstrap(): Promise<void> {
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
      },
      'Growzy API listening',
    )
  })

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    logger.info({ signal }, 'Shutting down API')

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
  })
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception')
    captureException(error)
    void shutdown('uncaughtException')
  })
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, 'Failed to start API')
  process.exit(1)
})
