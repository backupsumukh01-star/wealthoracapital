import type { Redis } from 'ioredis'

import type { CacheClient } from './cache.types.js'

export class RedisCacheClient implements CacheClient {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(`cache:${key}`)
    if (raw == null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    const payload = JSON.stringify(value)
    if (ttlSeconds > 0) {
      await this.redis.set(`cache:${key}`, payload, 'EX', ttlSeconds)
    } else {
      await this.redis.set(`cache:${key}`, payload)
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(`cache:${key}`)
  }

  async clear(): Promise<void> {
    const stream = this.redis.scanStream({ match: 'cache:*', count: 100 })
    const pipeline = this.redis.pipeline()
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key)
      }
    }
    await pipeline.exec()
  }
}
