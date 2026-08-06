import rateLimit from 'express-rate-limit'
import { ERROR_CODES } from '@meridian/shared'

import { COOKIE_NAMES } from '../config/cookies.js'
import { env } from '../config/env.js'
import { getRedis } from '../services/redis/client.js'
import { createMeta } from '../utils/response.js'
import { createRedisRateLimitStore } from './redis-rate-limit-store.js'

function optionalRedisStore(prefix?: string) {
  if (env.RATE_LIMIT_STORE !== 'redis') return undefined
  const redis = getRedis()
  if (!redis) return undefined
  return createRedisRateLimitStore(redis, prefix)
}

/**
 * express-rate-limit v7 warns when `trust proxy` is true.
 * We intentionally trust the Render/proxy hop and key by X-Forwarded-For via Express.
 */
const validate = { trustProxy: false as const }

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  ...(optionalRedisStore() ? { store: optionalRedisStore() } : {}),
  skip: (req) => {
    const path = (req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0] ?? ''
    const method = (req.method ?? 'GET').toUpperCase()

    // Health / version / metrics must never 429 — Render probes + ops dashboards.
    if (
      path === '/api/health' ||
      path === '/api/health/live' ||
      path === '/api/health/ready' ||
      path === '/api/version' ||
      path === '/api/metrics' ||
      path === '/' ||
      path.startsWith('/api/docs') ||
      path === '/api/openapi.json' ||
      path === '/api/redoc'
    ) {
      return true
    }

    // CORS preflight must never burn rate-limit budget.
    if (method === 'OPTIONS') return true

    const cookie = req.headers.cookie ?? ''
    const accessCookie = `${COOKIE_NAMES.accessToken}=`
    const hasSession = cookie.includes(accessCookie)

    // Authenticated console/page-init — admin KYC alone fires me + user + kyc + N document blobs.
    // Also skip authenticated admin mutations so approve/reject/publish are not 429'd mid-ops.
    if (hasSession) {
      if (
        path === '/api/v1/auth/me' ||
        path === '/api/v1/auth/refresh' ||
        path === '/api/v1/csrf' ||
        path.startsWith('/api/v1/admin') ||
        path.startsWith('/api/v1/notifications') ||
        path.startsWith('/api/v1/kyc') ||
        path.startsWith('/api/v1/deposits') ||
        path.startsWith('/api/v1/withdrawals') ||
        path.startsWith('/api/v1/files') ||
        path.startsWith('/api/v1/wallet') ||
        path.startsWith('/api/v1/activity')
      ) {
        return true
      }
    }

    return false
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests. Please try again later.',
      },
      meta: createMeta(req.requestId),
    })
  },
})

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  ...(optionalRedisStore('rl:auth:') ? { store: optionalRedisStore('rl:auth:') } : {}),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many authentication attempts. Please try again later.',
      },
      meta: createMeta(req.requestId),
    })
  },
})

/** Stricter limiter for verification email resend (abuse + inbox flooding). */
export const verificationResendRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  ...(optionalRedisStore('rl:verify-resend:')
    ? { store: optionalRedisStore('rl:verify-resend:') }
    : {}),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many verification email requests. Please try again later.',
      },
      meta: createMeta(req.requestId),
    })
  },
})

/** Stricter limiter for payment provider webhooks (unauthenticated surface). */
export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  ...(optionalRedisStore('rl:webhook:') ? { store: optionalRedisStore('rl:webhook:') } : {}),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Webhook rate limit exceeded.',
      },
      meta: createMeta(req.requestId),
    })
  },
})
