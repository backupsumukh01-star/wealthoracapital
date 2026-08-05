import client from 'prom-client'

import { env } from '../config/env.js'

const enabled = env.METRICS_ENABLED

if (enabled) {
  client.collectDefaultMetrics({ prefix: 'growzy_' })
}

export const httpRequestDuration = enabled
  ? new client.Histogram({
      name: 'growzy_http_request_duration_seconds',
      help: 'HTTP request latency',
      labelNames: ['method', 'route', 'status_code'] as const,
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    })
  : null

export const httpRequestTotal = enabled
  ? new client.Counter({
      name: 'growzy_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'] as const,
    })
  : null

export const redisUp = enabled
  ? new client.Gauge({
      name: 'growzy_redis_up',
      help: 'Redis availability (1=up, 0=down, -1=disabled)',
    })
  : null

export const dbUp = enabled
  ? new client.Gauge({
      name: 'growzy_db_up',
      help: 'Database availability (1=up, 0=down)',
    })
  : null

export const queueWaiting = enabled
  ? new client.Gauge({
      name: 'growzy_queue_waiting',
      help: 'BullMQ waiting jobs',
      labelNames: ['queue'] as const,
    })
  : null

export async function refreshOpsGauges(): Promise<void> {
  if (!enabled) return
  try {
    const { pingRedis } = await import('../services/redis/client.js')
    const redis = await pingRedis()
    redisUp?.set(redis === 'up' ? 1 : redis === 'disabled' ? -1 : 0)
  } catch {
    redisUp?.set(0)
  }
  try {
    const { prisma } = await import('../database/prisma.js')
    await prisma.$queryRaw`SELECT 1`
    dbUp?.set(1)
  } catch {
    dbUp?.set(0)
  }
  if (env.JOB_DRIVER === 'bullmq' && env.REDIS_URL) {
    try {
      const { getQueueCounts } = await import('../jobs/bullmq.js')
      const counts = await getQueueCounts()
      for (const [queue, c] of Object.entries(counts)) {
        queueWaiting?.set({ queue }, c.waiting)
      }
    } catch {
      // ignore when Redis/queue unavailable
    }
  }
}

export async function metricsText(): Promise<string> {
  if (!enabled) return '# metrics disabled\n'
  await refreshOpsGauges()
  return client.register.metrics()
}

export { client as prometheusClient }
