/**
 * Namespaced Redis/cache keys for Growzy performance surfaces.
 * Uses the shared cache client (memory or Redis).
 */
import { cache } from './index.js'

const TTL = {
  session: 60 * 15,
  api: 60,
  leaderboard: 60 * 5,
  performance: 60 * 2,
  temporary: 60 * 10,
} as const

export const cacheKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  api: (route: string, hash: string) => `api:${route}:${hash}`,
  leaderboard: (period: string) => `leaderboard:${period}`,
  performance: (userId: string) => `perf:${userId}`,
  temporary: (key: string) => `tmp:${key}`,
}

export async function getSessionCache<T>(sessionId: string): Promise<T | null> {
  return cache.get<T>(cacheKeys.session(sessionId))
}

export async function setSessionCache<T>(sessionId: string, value: T): Promise<void> {
  await cache.set(cacheKeys.session(sessionId), value, TTL.session)
}

export async function getApiCache<T>(route: string, hash: string): Promise<T | null> {
  return cache.get<T>(cacheKeys.api(route, hash))
}

export async function setApiCache<T>(
  route: string,
  hash: string,
  value: T,
  ttl = TTL.api,
): Promise<void> {
  await cache.set(cacheKeys.api(route, hash), value, ttl)
}

export async function getLeaderboardCache<T>(period: string): Promise<T | null> {
  return cache.get<T>(cacheKeys.leaderboard(period))
}

export async function setLeaderboardCache<T>(period: string, value: T): Promise<void> {
  await cache.set(cacheKeys.leaderboard(period), value, TTL.leaderboard)
}

export async function getPerformanceCache<T>(userId: string): Promise<T | null> {
  return cache.get<T>(cacheKeys.performance(userId))
}

export async function setPerformanceCache<T>(userId: string, value: T): Promise<void> {
  await cache.set(cacheKeys.performance(userId), value, TTL.performance)
}

export async function setTemporaryData<T>(
  key: string,
  value: T,
  ttl = TTL.temporary,
): Promise<void> {
  await cache.set(cacheKeys.temporary(key), value, ttl)
}

export async function getTemporaryData<T>(key: string): Promise<T | null> {
  return cache.get<T>(cacheKeys.temporary(key))
}
