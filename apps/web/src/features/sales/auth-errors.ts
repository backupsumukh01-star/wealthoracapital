import { ERROR_CODES } from '@meridian/shared'

import { ApiError } from '@/lib/api-client'

const GENERIC_SIGN_IN = 'Sign-in failed. Please try again.'
const DISABLED_ACCOUNT = 'This sales account has been disabled. Contact your administrator.'
const BAD_CREDENTIALS = 'Incorrect email or password.'

/** Maps API failures to copy users can act on. Never surfaces JWTs, cookies, or stack traces. */
export function salesLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return GENERIC_SIGN_IN
  }

  switch (error.code) {
    case ERROR_CODES.ACCOUNT_SUSPENDED:
      return DISABLED_ACCOUNT
    case ERROR_CODES.UNAUTHENTICATED:
      return BAD_CREDENTIALS
    case ERROR_CODES.VALIDATION_ERROR:
      return 'Enter a valid email and password.'
    case ERROR_CODES.RATE_LIMITED:
      return 'Too many sign-in attempts. Wait a moment and try again.'
    case ERROR_CODES.NETWORK_ERROR:
      return error.message || 'We could not reach the server. Check your connection and try again.'
    default:
      return GENERIC_SIGN_IN
  }
}

export function isSalesDisabledError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.ACCOUNT_SUSPENDED
}

export function isSalesUnauthorized(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return (
    error.status === 401 ||
    error.code === ERROR_CODES.UNAUTHENTICATED ||
    error.code === ERROR_CODES.TOKEN_EXPIRED ||
    error.code === ERROR_CODES.ACCOUNT_SUSPENDED
  )
}

export function isSalesForbidden(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.code === ERROR_CODES.FORBIDDEN)
}

export function isSalesNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.code === ERROR_CODES.NOT_FOUND)
}

export function salesQueryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === ERROR_CODES.NETWORK_ERROR) {
      return error.message
    }
    if (error.status === 401 || error.code === ERROR_CODES.UNAUTHENTICATED) {
      return 'Your sales session has expired. Please sign in again.'
    }
    if (error.code === ERROR_CODES.ACCOUNT_SUSPENDED) {
      return DISABLED_ACCOUNT
    }
    if (error.status === 403 || error.code === ERROR_CODES.FORBIDDEN) {
      return 'You do not have access to this sales view.'
    }
    if (error.status === 404 || error.code === ERROR_CODES.NOT_FOUND) {
      return 'That sales record could not be found.'
    }
  }
  return 'Something went wrong loading this page. Please try again.'
}
