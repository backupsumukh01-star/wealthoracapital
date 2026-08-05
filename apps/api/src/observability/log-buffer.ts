/**
 * In-process ring buffers for recent system / error log lines.
 * Production still ships logs to stdout (and whatever aggregator tails them);
 * this buffer powers the operator monitoring dashboard without a separate log store.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type BufferedLogEntry = {
  id: string
  at: string
  level: LogLevel
  message: string
  requestId?: string
  meta?: Record<string, unknown>
}

const MAX = 200
const systemLogs: BufferedLogEntry[] = []
const errorLogs: BufferedLogEntry[] = []
let seq = 0

function push(list: BufferedLogEntry[], entry: BufferedLogEntry) {
  list.unshift(entry)
  if (list.length > MAX) list.length = MAX
}

export function recordSystemLog(input: {
  level: LogLevel
  message: string
  requestId?: string
  meta?: Record<string, unknown>
}): void {
  const entry: BufferedLogEntry = {
    id: `log_${Date.now()}_${++seq}`,
    at: new Date().toISOString(),
    level: input.level,
    message: input.message.slice(0, 500),
    requestId: input.requestId,
    meta: input.meta,
  }
  push(systemLogs, entry)
  if (input.level === 'error' || input.level === 'fatal') {
    push(errorLogs, entry)
  }
}

export function getSystemLogs(limit = 40): BufferedLogEntry[] {
  return systemLogs.slice(0, limit)
}

export function getErrorLogs(limit = 40): BufferedLogEntry[] {
  return errorLogs.slice(0, limit)
}
