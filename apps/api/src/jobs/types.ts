export type JobName =
  | 'send-email'
  | 'cleanup-expired-sessions'
  | 'cleanup-expired-tokens'
  | 'daily-return-prepare'
  | 'portfolio-snapshots'
  | 'performance-recalculate'
  | 'email-outbox-process'
  | 'cms-scheduled-publish'
  | 'broadcast-scheduled-send'
  | 'generate-report'
  | 'send-notification'
  | 'daily-owner-report'
  | 'stability-monitor'

export interface JobPayloadMap {
  'send-email': { to: string; template: string }
  'cleanup-expired-sessions': Record<string, never>
  'cleanup-expired-tokens': Record<string, never>
  'daily-return-prepare': Record<string, never>
  'portfolio-snapshots': Record<string, never>
  'performance-recalculate': Record<string, never>
  'email-outbox-process': Record<string, never>
  'cms-scheduled-publish': Record<string, never>
  'broadcast-scheduled-send': Record<string, never>
  'generate-report': { reportJobId: string }
  'send-notification': { userId: string; title: string; body: string }
  'daily-owner-report': Record<string, never>
  'stability-monitor': Record<string, never>
}

export interface Job<T extends JobName = JobName> {
  name: T
  payload: JobPayloadMap[T]
  enqueuedAt: string
}

export type JobHandler<T extends JobName> = (payload: JobPayloadMap[T]) => Promise<void>

export interface JobQueueDriver {
  register<T extends JobName>(name: T, handler: JobHandler<T>): void
  enqueue<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void>
}
