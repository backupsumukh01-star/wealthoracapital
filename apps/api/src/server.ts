import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './database/prisma.js'
import { DEFAULT_EMAIL_TEMPLATES } from './emails/default-templates.js'
import { registerDefaultJobs } from './jobs/index.js'
import { emailTemplateService } from './services/email/email-template.service.js'
import { logger } from './utils/logger.js'

async function bootstrap(): Promise<void> {
  registerDefaultJobs()
  await connectDatabase()

  try {
    await emailTemplateService.ensureSeeded(DEFAULT_EMAIL_TEMPLATES)
  } catch (error) {
    logger.error({ error }, 'Failed to seed default email templates')
  }

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        apiUrl: env.API_URL,
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
      } catch (disconnectError) {
        logger.error({ error: disconnectError }, 'Error while disconnecting database')
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
  })
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception')
    void shutdown('uncaughtException')
  })
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, 'Failed to start API')
  process.exit(1)
})
