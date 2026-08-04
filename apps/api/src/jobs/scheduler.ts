/**
 * Scheduler abstraction for Phase 5.
 * No BullMQ/Redis — in-process interval registry only.
 */

type JobHandler = () => Promise<void>

type ScheduledJob = {
  name: string
  intervalMs: number
  handler: JobHandler
  timer?: ReturnType<typeof setInterval>
  running: boolean
}

const jobs = new Map<string, ScheduledJob>()

export const scheduler = {
  register(name: string, intervalMs: number, handler: JobHandler): void {
    if (jobs.has(name)) {
      this.unregister(name)
    }
    const job: ScheduledJob = { name, intervalMs, handler, running: false }
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

  async runNow(name: string): Promise<void> {
    const job = jobs.get(name)
    if (!job || job.running) return
    job.running = true
    try {
      await job.handler()
    } finally {
      job.running = false
    }
  },

  list(): Array<{ name: string; intervalMs: number }> {
    return [...jobs.values()].map((j) => ({ name: j.name, intervalMs: j.intervalMs }))
  },
}
