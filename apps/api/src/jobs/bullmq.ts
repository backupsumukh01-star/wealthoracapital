import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq'

import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { getRedis } from '../services/redis/client.js'
import type { JobName, JobPayloadMap } from './types.js'

export type QueueGroup =
  | 'email'
  | 'notifications'
  | 'trading'
  | 'finance'
  | 'reports'
  | 'scheduler'
  | 'cleanup'
  | 'retry'

export const QUEUE_BY_GROUP: Record<QueueGroup, string> = {
  email: 'growzy-email',
  notifications: 'growzy-notifications',
  trading: 'growzy-trading',
  finance: 'growzy-finance',
  reports: 'growzy-reports',
  scheduler: 'growzy-scheduler',
  cleanup: 'growzy-cleanup',
  retry: 'growzy-retry',
}

/** @deprecated shared name kept for metrics labels */
export const QUEUE_NAME = 'growzy-jobs'

const HANDLER_TO_GROUP: Record<JobName, QueueGroup> = {
  'send-email': 'email',
  'email-outbox-process': 'email',
  'cleanup-expired-sessions': 'cleanup',
  'cleanup-expired-tokens': 'cleanup',
  'daily-return-prepare': 'trading',
  'portfolio-snapshots': 'trading',
  'performance-recalculate': 'trading',
  'cms-scheduled-publish': 'scheduler',
  'broadcast-scheduled-send': 'scheduler',
  'generate-report': 'reports',
  'send-notification': 'notifications',
}

export function jobGroup(name: JobName): QueueGroup {
  return HANDLER_TO_GROUP[name]
}

export function connectionOptions(): ConnectionOptions | null {
  if (!env.REDIS_URL) return null
  const redis = getRedis()
  if (!redis) return null
  return redis.duplicate() as unknown as ConnectionOptions
}

const queues = new Map<string, Queue>()

export function getQueueForGroup(group: QueueGroup): Queue | null {
  const connection = connectionOptions()
  if (!connection) return null
  const name = QUEUE_BY_GROUP[group]
  let q = queues.get(name)
  if (!q) {
    q = new Queue(name, { connection })
    queues.set(name, q)
  }
  return q
}

export function getJobQueue(): Queue | null {
  return getQueueForGroup('scheduler')
}

export async function enqueueBullmq<T extends JobName>(
  name: T,
  payload: JobPayloadMap[T],
  opts?: JobsOptions,
): Promise<void> {
  const group = HANDLER_TO_GROUP[name]
  const q = getQueueForGroup(group)
  if (!q) {
    throw new Error('BullMQ queue unavailable')
  }
  await q.add(
    name,
    { name, payload, group },
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    },
  )
  logger.debug({ name, group }, 'BullMQ job enqueued')
}

export async function registerRepeatableJobs(): Promise<void> {
  const repeats: Array<{ name: JobName; every: number }> = [
    { name: 'email-outbox-process', every: 60_000 },
    { name: 'cms-scheduled-publish', every: 60_000 },
    { name: 'broadcast-scheduled-send', every: 60_000 },
    { name: 'daily-return-prepare', every: 24 * 60 * 60 * 1000 },
    { name: 'portfolio-snapshots', every: 24 * 60 * 60 * 1000 },
    { name: 'performance-recalculate', every: 24 * 60 * 60 * 1000 },
    { name: 'cleanup-expired-sessions', every: 60 * 60 * 1000 },
    { name: 'cleanup-expired-tokens', every: 60 * 60 * 1000 },
  ]

  for (const job of repeats) {
    const group = HANDLER_TO_GROUP[job.name]
    const q = getQueueForGroup(group)
    if (!q) continue
    // BullMQ v6+: use job schedulers instead of legacy `repeat` on Queue.add
    await q.upsertJobScheduler(
      `repeat:${job.name}`,
      { every: job.every },
      {
        name: job.name,
        data: { name: job.name, payload: {}, group },
        opts: {
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
    )
  }
  logger.info({ count: repeats.length }, 'BullMQ repeatable jobs registered')
}

export function groupsForWorker(workerGroup: string): QueueGroup[] {
  const g = workerGroup.toLowerCase()
  if (g === 'all') {
    return Object.keys(QUEUE_BY_GROUP) as QueueGroup[]
  }
  if (g in QUEUE_BY_GROUP) {
    return [g as QueueGroup]
  }
  return ['scheduler']
}

export function createWorker(
  group: QueueGroup,
  processor: (name: JobName, payload: unknown) => Promise<void>,
): Worker | null {
  const connection = connectionOptions()
  if (!connection) return null

  const worker = new Worker(
    QUEUE_BY_GROUP[group],
    async (job) => {
      const data = job.data as { name: JobName; payload: unknown; group?: string }
      await processor(data.name, data.payload)
    },
    { connection, concurrency: Number(process.env.WORKER_CONCURRENCY || (group === 'email' ? 5 : 2)) },
  )

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, name: job?.name, group, error }, 'BullMQ job failed')
  })
  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, name: job.name, group }, 'BullMQ job completed')
  })

  return worker
}

export async function getQueueCounts(): Promise<Record<string, { waiting: number; active: number; failed: number }>> {
  const result: Record<string, { waiting: number; active: number; failed: number }> = {}
  for (const group of Object.keys(QUEUE_BY_GROUP) as QueueGroup[]) {
    const q = getQueueForGroup(group)
    if (!q) continue
    const counts = await q.getJobCounts('waiting', 'active', 'failed')
    result[group] = {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      failed: counts.failed ?? 0,
    }
  }
  return result
}
