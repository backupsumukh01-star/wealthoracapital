'use client'

import { toast as sonner } from 'sonner'

/**
 * The toast API, wrapped once.
 *
 * Wrapping it fixes the vocabulary — `success`, `error`, `info`, `promise` — and gives us one
 * place to change the library later without touching every call site.
 *
 * Toasts are for confirmations and transient failures. Anything the user must act on belongs in
 * an `<Alert>` on the page, because a toast disappears and an unread error is an unfixed problem
 * (docs/09 §Feedback).
 */
export const toast = {
  success: (message: string, description?: string) => sonner.success(message, { description }),
  error: (message: string, description?: string) => sonner.error(message, { description }),
  info: (message: string, description?: string) => sonner(message, { description }),
  /** Ties a toast to a request's lifecycle: pending, then resolved or rejected. */
  promise: sonner.promise,
  dismiss: sonner.dismiss,
}
