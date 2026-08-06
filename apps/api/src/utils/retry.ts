import { logger } from './logger.js'

export type RetryOptions = {
  retries?: number
  minDelayMs?: number
  maxDelayMs?: number
  /** Return true to retry this error. */
  shouldRetry?: (err: unknown) => boolean
  label?: string
}

const TRANSIENT_CODES = new Set([
  'P1001', // Can't reach database
  'P1002', // Database timeout
  'P1008', // Operations timed out
  'P1017', // Server closed connection
  'P2024', // Timed out fetching connection from pool
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
])

export function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; name?: string }
  if (e.code && TRANSIENT_CODES.has(String(e.code))) return true
  const msg = (e.message ?? '').toLowerCase()
  return (
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('temporar') ||
    msg.includes('deadlock') ||
    msg.includes('too many connections') ||
    msg.includes('econnreset')
  )
}

/** Permanent failures must not be retried (validation, auth, not found). */
export function isPermanentError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { statusCode?: number; code?: string }
  if (typeof e.statusCode === 'number' && e.statusCode >= 400 && e.statusCode < 500) return true
  if (e.code && ['P2002', 'P2025', 'P2003'].includes(String(e.code))) return true
  return false
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3
  const minDelay = options.minDelayMs ?? 200
  const maxDelay = options.maxDelayMs ?? 2_000
  const shouldRetry = options.shouldRetry ?? ((err) => isTransientError(err) && !isPermanentError(err))

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= retries || !shouldRetry(err)) throw err
      const delay = Math.min(maxDelay, minDelay * 2 ** attempt)
      logger.warn(
        { err, attempt: attempt + 1, retries, delay, label: options.label },
        'Retrying transient failure',
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}
