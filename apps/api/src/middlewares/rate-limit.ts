import rateLimit from 'express-rate-limit'
import { ERROR_CODES } from '@meridian/shared'

import { env } from '../config/env.js'
import { getRedis } from '../services/redis/client.js'
import { createMeta } from '../utils/response.js'
import { createRedisRateLimitStore } from './redis-rate-limit-store.js'

function optionalRedisStore() {
  if (env.RATE_LIMIT_STORE !== 'redis') return undefined
  const redis = getRedis()
  if (!redis) return undefined
  return createRedisRateLimitStore(redis)
}

const store = optionalRedisStore()

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  ...(store ? { store } : {}),
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
  ...(store && getRedis()
    ? { store: createRedisRateLimitStore(getRedis()!, 'rl:auth:') }
    : {}),
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
