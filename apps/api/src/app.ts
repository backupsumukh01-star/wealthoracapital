import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { pinoHttp } from 'pino-http'

import { env, getCorsOrigins } from './config/env.js'
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
        ignore: (req) =>
          req.url === '/api/health' ||
          Boolean(req.url?.startsWith('/api/docs')) ||
          req.url === '/api/redoc',
      },
    }),
  )
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            'https://unpkg.com',
            'https://cdn.redoc.ly',
            'https://cdn.jsdelivr.net',
          ],
          'style-src': [
            "'self'",
            "'unsafe-inline'",
            'https://unpkg.com',
            'https://cdn.redoc.ly',
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          'img-src': ["'self'", 'data:', 'https:', 'blob:'],
          'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
          'connect-src': ["'self'"],
          'worker-src': ["'self'", 'blob:'],
          'frame-src': ["'self'"],
        },
      },
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
      data: {
        service: 'growzy-api',
        health: '/api/health',
        version: '/api/version',
        docs: '/api/docs',
        docsJson: '/api/docs/json',
        docsYaml: '/api/docs/yaml',
        redoc: '/api/redoc',
      },
      meta: createMeta(req.requestId),
    })
  })

  app.use('/uploads', (req, res, next) => {
    // KYC objects are private — only signed/authenticated download routes may serve them.
    if (req.path.replace(/\\/g, '/').startsWith('/kyc')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Private KYC file storage.' },
        meta: createMeta(req.requestId),
      })
      return
    }
    next()
  })
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_ROOT)))
  app.use('/api', createApiRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
