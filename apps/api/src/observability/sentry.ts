/**
 * Sentry abstraction — no-op unless SENTRY_DSN is configured.
 * Swap implementation for @sentry/node without changing call sites.
 */
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

type SentryLike = {
  init: (opts: Record<string, unknown>) => void
  captureException: (error: unknown, context?: Record<string, unknown>) => void
  captureMessage: (message: string, level?: string) => void
}

const noop: SentryLike = {
  init: () => undefined,
  captureException: () => undefined,
  captureMessage: () => undefined,
}

let sentry: SentryLike = noop
let initialized = false

export async function initSentry(): Promise<void> {
  if (initialized || !env.SENTRY_DSN) return
  initialized = true
  try {
    // Dynamic optional dependency — keep package optional for lean local installs
    const mod = (await import('@sentry/node').catch(() => null)) as {
      init?: SentryLike['init']
      captureException?: SentryLike['captureException']
      captureMessage?: SentryLike['captureMessage']
    } | null
    if (!mod?.init) {
      logger.info('SENTRY_DSN set but @sentry/node not installed; using no-op error tracker')
      return
    }
    mod.init({
      dsn: env.SENTRY_DSN,
      environment: env.APP_ENV || env.NODE_ENV,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    })
    sentry = {
      init: mod.init,
      captureException: mod.captureException ?? noop.captureException,
      captureMessage: mod.captureMessage ?? noop.captureMessage,
    }
    logger.info('Sentry initialized')
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize Sentry')
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  sentry.captureException(error, context)
}

export function captureMessage(message: string, level = 'info'): void {
  sentry.captureMessage(message, level)
}
