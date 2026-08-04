import { ERROR_CODES } from '@meridian/shared'

import { ApiError } from '@/services/http'
import type { AsyncViewState } from '@/types/domain'

/** Map transport errors → UI async states. */
export function viewStateFromError(error: unknown): AsyncViewState {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline'
  if (!(error instanceof ApiError)) return 'error'
  if (error.status === 0 || error.code === ERROR_CODES.NETWORK_ERROR) return 'offline'
  if (error.status === 401 || error.isAuthError) return 'unauthorized'
  if (error.status === 403 || error.code === ERROR_CODES.FORBIDDEN) return 'forbidden'
  if (error.status === 404 || error.code === ERROR_CODES.NOT_FOUND) return 'not_found'
  if (error.code === ERROR_CODES.MAINTENANCE_MODE || error.status === 503) return 'maintenance'
  return 'error'
}

export function userMessageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export type AppErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'maintenance'
  | 'unknown'

export function classifyError(error: unknown): AppErrorKind {
  const state = viewStateFromError(error)
  switch (state) {
    case 'offline':
      return 'network'
    case 'unauthorized':
      return 'unauthorized'
    case 'forbidden':
      return 'forbidden'
    case 'not_found':
      return 'not_found'
    case 'maintenance':
      return 'maintenance'
    default:
      return 'unknown'
  }
}
