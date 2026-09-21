import type { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { ERROR_CODES } from '@meridian/shared'

import { COOKIE_NAMES } from '../config/cookies.js'
import { env } from '../config/env.js'
import { getRedis } from '../services/redis/client.js'
import { createMeta } from '../utils/response.js'
import { createRedisRateLimitStore } from './redis-rate-limit-store.js'

function optionalRedisStore(prefix?: string, windowMs = env.RATE_LIMIT_WINDOW_MS) {
  if (env.RATE_LIMIT_STORE !== 'redis') return undefined
  const redis = getRedis()
  if (!redis) return undefined
  return createRedisRateLimitStore(redis, prefix, Math.max(1, Math.ceil(windowMs / 1000)))
}

/**
 * express-rate-limit v7 warns when `trust proxy` is true.
 * Render sits behind a proxy; `app.set('trust proxy', true)` makes `req.ip` the client
 * address Express derived from the trusted hop. Do not key off the raw X-Forwarded-For
 * header — the leftmost value is client-controlled and would bypass limits.
 */
const validate = { trustProxy: false as const }

export function requestPath(req: Request): string {
  return (req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0] ?? ''
}

/** Never collapse every client onto an empty key (undefined IP behind a mis-set proxy). */
export function clientRateLimitKey(req: Request): string {
  const ip = typeof req.ip === 'string' ? req.ip.trim() : ''
  if (ip) return ip
  const remote = typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress.trim() : ''
  return remote || 'unknown'
}

const DEDICATED_AUTH_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/google',
  '/api/v1/auth/google/callback',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/verify-email/resend',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/sales/auth/login',
])

/** Routes that already have a dedicated limiter — must not also consume the global budget. */
export function isDedicatedAuthPath(path: string): boolean {
  return DEDICATED_AUTH_PATHS.has(path)
}

export function shouldSkipGlobalRateLimit(req: Request): boolean {
  const path = requestPath(req)
  const method = (req.method ?? 'GET').toUpperCase()

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

  if (method === 'OPTIONS') return true

  // Login/register require this bootstrap while unauthenticated.
  if (path === '/api/v1/csrf') return true

  if (isDedicatedAuthPath(path)) return true

  if (path.startsWith('/api/v1/webhooks')) return true

  const cookie = req.headers.cookie ?? ''
  const hasSession = cookie.includes(`${COOKIE_NAMES.accessToken}=`)
  if (!hasSession) return false

  if (
    path === '/api/v1/auth/me' ||
    path === '/api/v1/auth/refresh' ||
    path.startsWith('/api/v1/admin') ||
    path.startsWith('/api/v1/notifications') ||
    path.startsWith('/api/v1/kyc') ||
    path.startsWith('/api/v1/deposits') ||
    path.startsWith('/api/v1/withdrawals') ||
    path.startsWith('/api/v1/files') ||
    path.startsWith('/api/v1/wallet') ||
    path.startsWith('/api/v1/activity') ||
    path.startsWith('/api/v1/cms')
  ) {
    return true
  }

  return false
}

function rateLimitedHandler(message: string) {
  return (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message,
      },
      meta: createMeta(req.requestId),
    })
  }
}

const globalStore = optionalRedisStore()

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  ...(globalStore ? { store: globalStore } : {}),
  skip: shouldSkipGlobalRateLimit,
  handler: rateLimitedHandler('Too many requests. Please try again later.'),
})

const loginStore = optionalRedisStore('rl:login:')

/**
 * Password login brute-force bucket (investor + salesman).
 * Successful 2xx logins do not consume the budget so a shared office IP can sign in.
 * Failed attempts still count.
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  skipSuccessfulRequests: true,
  ...(loginStore ? { store: loginStore } : {}),
  handler: rateLimitedHandler('Too many authentication attempts. Please try again later.'),
})

const authStore = optionalRedisStore('rl:auth:')

/**
 * Registration, password reset, email OTP/verify — count every attempt.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  ...(authStore ? { store: authStore } : {}),
  handler: rateLimitedHandler('Too many authentication attempts. Please try again later.'),
})

const oauthWindowMs = env.RATE_LIMIT_WINDOW_MS
const oauthStore = optionalRedisStore('rl:oauth:', oauthWindowMs)

/**
 * Google start + callback are two GETs per sign-in and are not password guesses.
 * Keep a dedicated cap so OAuth cannot drain the password brute-force bucket.
 */
export const oauthRateLimiter = rateLimit({
  windowMs: oauthWindowMs,
  max: Math.max(env.AUTH_RATE_LIMIT_MAX * 3, 60),
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  ...(oauthStore ? { store: oauthStore } : {}),
  handler: rateLimitedHandler('Too many Google sign-in attempts. Please try again later.'),
})

const verifyResendWindowMs = 60 * 60 * 1000
const verifyResendStore = optionalRedisStore('rl:verify-resend:', verifyResendWindowMs)

/** Stricter limiter for verification email resend (abuse + inbox flooding). */
export const verificationResendRateLimiter = rateLimit({
  windowMs: verifyResendWindowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  ...(verifyResendStore ? { store: verifyResendStore } : {}),
  handler: rateLimitedHandler('Too many verification email requests. Please try again later.'),
})

const webhookStore = optionalRedisStore('rl:webhook:', 60_000)

/** Stricter limiter for payment provider webhooks (unauthenticated surface). */
export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  ...(webhookStore ? { store: webhookStore } : {}),
  handler: rateLimitedHandler('Webhook rate limit exceeded.'),
})

const handoverStore = optionalRedisStore('rl:handover:', 60 * 60 * 1000)

/** Strict limiter for destructive client-handover reset. */
export const handoverResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  keyGenerator: clientRateLimitKey,
  ...(handoverStore ? { store: handoverStore } : {}),
  handler: rateLimitedHandler('Too many handover reset attempts. Please try again later.'),
})
