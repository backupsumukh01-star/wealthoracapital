import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import { getRedis } from '../redis/client.js'
import type { CacheClient } from './cache.types.js'
import { MemoryCacheClient } from './memory-cache.js'
import { RedisCacheClient } from './redis-cache.js'

/**
 * Cache factory — memory by default; Redis when CACHE_DRIVER=redis and connection succeeds.
 */
function createCacheClient(): CacheClient {
  if (env.CACHE_DRIVER === 'redis') {
    const redis = getRedis()
    if (redis) {
      logger.info('Using Redis cache driver')
      return new RedisCacheClient(redis)
    }
    logger.warn('CACHE_DRIVER=redis but Redis unavailable; falling back to memory cache')
  }
  return new MemoryCacheClient()
}

export const cache = createCacheClient()
export type { CacheClient } from './cache.types.js'
