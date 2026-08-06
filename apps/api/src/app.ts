import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { pinoHttp } from 'pino-http'

import { env, getCorsOrigins, isProduction } from './config/env.js'
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js'
import { csrfProtection } from './middlewares/csrf.js'
import { globalRateLimiter } from './middlewares/rate-limit.js'
import { metricsMiddleware } from './middlewares/metrics.js'
import { requestIdMiddleware } from './middlewares/request-id.js'
import { requestTimeoutMiddleware } from './middlewares/request-timeout.js'
import { noStoreCacheMiddleware } from './middlewares/no-store-cache.js'
import { sanitizeRequest } from './middlewares/sanitize.js'
import { createApiRouter } from './routes/index.js'
import { createMeta } from './utils/response.js'
import { logger } from './utils/logger.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', true)
  app.disable('x-powered-by')

  app.use(requestIdMiddleware)
  app.use(requestTimeoutMiddleware)
  app.use(noStoreCacheMiddleware)
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: req.requestId,
      }),
      autoLogging: {
        ignore: (req) =>
          req.url === '/api/health' ||
          req.url === '/api/health/live' ||
          req.url === '/api/health/ready' ||
          req.url === '/api/metrics' ||
          Boolean(req.url?.startsWith('/api/docs')) ||
          req.url === '/api/openapi.json' ||
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
          ...(isProduction
            ? {
                'upgrade-insecure-requests': [],
              }
            : {}),
        },
      },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
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
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        const url = req.url ?? ''
        if (url.includes('/webhooks')) {
          ;(req as typeof req & { rawBody?: Buffer }).rawBody = buf
        }
      },
    }),
  )
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(sanitizeRequest)
  app.use(csrfProtection)
  app.use(metricsMiddleware)
  app.use(globalRateLimiter)

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: 'growzy-api',
        health: '/api/health',
        version: '/api/version',
        docs: '/api/docs',
        openapi: '/api/openapi.json',
        csrf: '/api/v1/csrf',
        docsJson: '/api/docs/json',
        docsYaml: '/api/docs/yaml',
        redoc: '/api/redoc',
      },
      meta: createMeta(req.requestId),
    })
  })

  app.use('/uploads', (req, res, next) => {
    // Private categories — only signed/authenticated download routes may serve these.
    const normalized = req.path.replace(/\\/g, '/')
    const privatePrefixes = ['/kyc', '/deposits', '/reports', '/avatars']
    if (privatePrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Private file storage.' },
        meta: createMeta(req.requestId),
      })
      return
    }
    next()
  })
  if (env.STORAGE_DRIVER === 'local') {
    app.use('/uploads', express.static(path.resolve(env.UPLOAD_ROOT)))
  } else {
    // Object storage: stream public media through the API (same URL shape as local).
    app.use('/uploads', async (req, res, next) => {
      try {
        const key = req.path.replace(/^\/+/, '')
        if (!key || key.includes('..')) {
          res.status(404).end()
          return
        }
        const { storage } = await import('./services/storage/index.js')
        const stream = await storage.openReadStream(key)
        stream.on('error', next)
        stream.pipe(res)
      } catch (err) {
        next(err)
      }
    })
  }
  app.use('/api', createApiRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
