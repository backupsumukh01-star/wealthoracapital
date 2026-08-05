/**
 * Ambient module so Sentry remains an optional runtime dependency.
 * Install `@sentry/node` in production images when SENTRY_DSN is set.
 */
declare module '@sentry/node' {
  export function init(opts: Record<string, unknown>): void
  export function captureException(error: unknown, context?: Record<string, unknown>): void
  export function captureMessage(message: string, level?: string): void
}
