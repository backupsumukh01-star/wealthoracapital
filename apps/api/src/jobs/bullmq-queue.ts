import { logger } from '../utils/logger.js'
import { enqueueBullmq } from './bullmq.js'
import type { InMemoryJobQueue } from './memory-queue.js'
import type { JobHandler, JobName, JobPayloadMap, JobQueueDriver } from './types.js'

/**
 * BullMQ-backed queue. Handlers are still registered locally so the worker
 * process can execute them; the API process primarily enqueues.
 */
export class BullmqJobQueue implements JobQueueDriver {
  constructor(private readonly local: InMemoryJobQueue) {}

  register<T extends JobName>(name: T, handler: JobHandler<T>): void {
    this.local.register(name, handler)
  }

  async enqueue<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void> {
    try {
      await enqueueBullmq(name, payload)
    } catch (error) {
      logger.warn({ error, name }, 'BullMQ enqueue failed; executing in-process')
      await this.local.enqueue(name, payload)
    }
  }
}
