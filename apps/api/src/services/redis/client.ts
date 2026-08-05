import { Redis } from 'ioredis'

import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

let client: Redis | null = null
let connectAttempted = false

/**
 * Lazy Redis singleton. Returns null when REDIS_URL is unset or connection fails
 * (unless REDIS_REQUIRED=true in production).
 */
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) {
    return null
  }
  if (client) {
    return client
  }
  if (connectAttempted && !client) {
    return null
  }
  connectAttempted = true

  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 10) return null
        return Math.min(times * 200, 2000)
      },
    })
    client.on('error', (error) => {
      logger.warn({ error }, 'Redis connection error')
    })
    client.on('connect', () => {
      logger.info('Redis connected')
    })
    return client
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize Redis; continuing without it')
    client = null
    if (env.REDIS_REQUIRED && env.NODE_ENV === 'production') {
      throw error
    }
    return null
  }
}

export async function pingRedis(): Promise<'up' | 'down' | 'disabled'> {
  if (!env.REDIS_URL) return 'disabled'
  const redis = getRedis()
  if (!redis) return 'down'
  try {
    const pong = await redis.ping()
    return pong === 'PONG' ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined)
    client = null
  }
}

/** Distributed lock helper (SET NX EX). */
export async function withRedisLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const redis = getRedis()
  if (!redis) {
    return fn()
  }
  const token = `${Date.now()}-${Math.random()}`
  const ok = await redis.set(`lock:${key}`, token, 'EX', ttlSeconds, 'NX')
  if (ok !== 'OK') {
    return null
  }
  try {
    return await fn()
  } finally {
    const current = await redis.get(`lock:${key}`)
    if (current === token) {
      await redis.del(`lock:${key}`)
    }
  }
}
