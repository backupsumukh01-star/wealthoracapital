import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { CacheClient } from './cache.types.js'
import { MemoryCacheClient } from './memory-cache.js'

/**
 * Redis-ready cache factory. Phase 2 defaults to in-memory so Redis is optional.
 * When CACHE_DRIVER=redis and REDIS_URL is set, a future Redis client can be wired here.
 */
function createCacheClient(): CacheClient {
  if (env.CACHE_DRIVER === 'redis' && env.REDIS_URL) {
    logger.warn('CACHE_DRIVER=redis requested but Redis client is not wired yet; using memory cache')
  }
  return new MemoryCacheClient()
}

export const cache = createCacheClient()
export type { CacheClient } from './cache.types.js'
