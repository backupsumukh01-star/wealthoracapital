/**
 * Scheduler abstraction — in-process interval registry.
 * Errors are isolated so a failing cron cannot take down the API process.
 */

import { logger } from '../utils/logger.js'
import { recordSystemLog } from '../observability/log-buffer.js'
import { processStability } from '../observability/process-stability.js'

type JobHandler = () => Promise<void>

type ScheduledJob = {
  name: string
  intervalMs: number
  handler: JobHandler
  timer?: ReturnType<typeof setInterval>
  running: boolean
  consecutiveFailures: number
}

const jobs = new Map<string, ScheduledJob>()

export const scheduler = {
  register(name: string, intervalMs: number, handler: JobHandler): void {
    if (jobs.has(name)) {
      this.unregister(name)
    }
    const job: ScheduledJob = {
      name,
      intervalMs,
      handler,
      running: false,
      consecutiveFailures: 0,
    }
    job.timer = setInterval(() => {
      void this.runNow(name)
    }, intervalMs)
    jobs.set(name, job)
  },

  unregister(name: string): void {
    const job = jobs.get(name)
    if (job?.timer) clearInterval(job.timer)
    jobs.delete(name)
  },

  unregisterAll(): void {
    for (const name of [...jobs.keys()]) this.unregister(name)
  },

  async runNow(name: string): Promise<void> {
    const job = jobs.get(name)
    if (!job || job.running) return
    job.running = true
    try {
      await job.handler()
      job.consecutiveFailures = 0
    } catch (error) {
      job.consecutiveFailures += 1
      logger.error({ error, jobName: name }, 'Scheduled job failed')
      recordSystemLog({
        level: 'error',
        message: `Scheduled job failed: ${name}`,
        meta: { err: error instanceof Error ? error.message : String(error) },
      })
      processStability.recordCrash({
        kind: 'job',
        message: `Job ${name}: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        service: 'growzy-api',
      })
      if (job.consecutiveFailures >= 3) {
        try {
          const { opsAlertService } = await import('../services/ops-alert.service.js')
          await opsAlertService.notify({
            event: 'SYSTEM_ERROR',
            title: 'Background job repeatedly failing',
            action: `Job ${name} failed ${job.consecutiveFailures} times in a row`,
            reason: error instanceof Error ? error.message : String(error),
            adminPath: '/admin/system-health',
            details: {
              Job: name,
              'Suggested cause': 'Handler bug or dependency outage',
              'Stack trace': (error instanceof Error ? error.stack : '—')?.slice(0, 1500) ?? '—',
            },
          })
        } catch {
          // never throw from alert path
        }
      }
    } finally {
      job.running = false
    }
  },

  list(): Array<{ name: string; intervalMs: number; consecutiveFailures: number }> {
    return [...jobs.values()].map((j) => ({
      name: j.name,
      intervalMs: j.intervalMs,
      consecutiveFailures: j.consecutiveFailures,
    }))
  },
}
