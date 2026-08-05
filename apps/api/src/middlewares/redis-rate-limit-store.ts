import type { Store } from 'express-rate-limit'
import type { Redis } from 'ioredis'

/**
 * Minimal Redis store for express-rate-limit v7+.
 */
export function createRedisRateLimitStore(redis: Redis, prefix = 'rl:'): Store {
  return {
    async increment(key: string) {
      const redisKey = `${prefix}${key}`
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.expire(redisKey, 900)
      }
      const ttl = await redis.pttl(redisKey)
      return {
        totalHits: count,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined,
      }
    },
    async decrement(key: string) {
      await redis.decr(`${prefix}${key}`)
    },
    async resetKey(key: string) {
      await redis.del(`${prefix}${key}`)
    },
  }
}
