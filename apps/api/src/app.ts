import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'

import { getCorsOrigins } from './config/env.js'
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js'
import { globalRateLimiter } from './middlewares/rate-limit.js'
import { requestIdMiddleware } from './middlewares/request-id.js'
import { sanitizeRequest } from './middlewares/sanitize.js'
import { createApiRouter } from './routes/index.js'
import { createMeta } from './utils/response.js'
import { logger } from './utils/logger.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(requestIdMiddleware)
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: req.requestId,
      }),
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    }),
  )
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-Id',
        'X-CSRF-Token',
        'Idempotency-Key',
      ],
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(sanitizeRequest)
  app.use(globalRateLimiter)

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      data: { service: 'growzy-api', health: '/api/health', version: '/api/version' },
      meta: createMeta(req.requestId),
    })
  })

  app.use('/api', createApiRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
