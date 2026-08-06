import { logger } from '../utils/logger.js'
import { recordSystemLog } from '../observability/log-buffer.js'
import { processStability } from '../observability/process-stability.js'
import type { JobHandler, JobName, JobPayloadMap, JobQueueDriver } from './types.js'

export class InMemoryJobQueue implements JobQueueDriver {
  private readonly handlers = new Map<JobName, JobHandler<JobName>>()
  private failedCount = 0

  register<T extends JobName>(name: T, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<JobName>)
  }

  async enqueue<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void> {
    const handler = this.handlers.get(name)
    if (!handler) {
      logger.warn({ name }, 'No handler registered for job')
      return
    }
    try {
      await handler(payload)
      logger.info({ jobName: name }, 'Job completed')
    } catch (error) {
      this.failedCount += 1
      logger.error({ error, jobName: name }, 'Job failed')
      recordSystemLog({
        level: 'error',
        message: `Job failed: ${name}`,
        meta: { err: error instanceof Error ? error.message : String(error) },
      })
      processStability.recordCrash({
        kind: 'job',
        message: `Job ${name}: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        service: 'growzy-api',
      })
      // Never rethrow — background work must not crash the API or leak unhandled rejections.
    }
  }

  getHandler(name: JobName): JobHandler<JobName> | undefined {
    return this.handlers.get(name)
  }

  getFailedCount(): number {
    return this.failedCount
  }
}
