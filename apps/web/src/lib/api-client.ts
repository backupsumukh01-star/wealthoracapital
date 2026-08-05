import { ERROR_CODES, type ApiResponse } from '@meridian/shared'

import { csrfHeaders, readCsrfCookie } from './csrf'
import { env } from './env'

/**
 * The single fetch wrapper. Components never call `fetch` directly — they go through a feature
 * hook, which goes through a feature api module, which goes through here (docs/02 §4).
 *
 * Scaffold status: the transport, the error type and the single-flight refresh guard are wired
 * up, because they shape every call site. No endpoint is implemented yet — feature api modules
 * are stubs until the API exists.
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isAuthError() {
    return this.code === ERROR_CODES.UNAUTHENTICATED || this.code === ERROR_CODES.TOKEN_EXPIRED
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Sent on money-moving POSTs so a double-click and a network retry are non-events. */
  idempotencyKey?: string
  /** Internal: prevents an infinite refresh loop. */
  skipRefresh?: boolean
}

/**
 * A dashboard firing six parallel queries when the access token expires must produce one
 * refresh call, not six racing rotations that trigger reuse detection against each other
 * (docs/08 §5).
 */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...csrfHeaders(),
    },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, idempotencyKey, skipRefresh, headers, ...rest } = options
  const csrf = readCsrfCookie()

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...rest,
    // Auth travels as httpOnly cookies, never as a bearer token in JS.
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch(() => {
    throw new ApiError(
      ERROR_CODES.NETWORK_ERROR,
      'We could not reach the server. Check your connection and try again.',
      0,
    )
  })

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.ok && payload?.success) {
    return payload.data
  }

  const error = payload && !payload.success ? payload.error : null
  const code = error?.code ?? ERROR_CODES.INTERNAL_ERROR

  // Retry once, and only once, behind a silent refresh.
  if (response.status === 401 && code === ERROR_CODES.TOKEN_EXPIRED && !skipRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      return apiClient<T>(path, { ...options, skipRefresh: true })
    }
  }

  throw new ApiError(
    code,
    error?.message ?? 'Something went wrong. Please try again.',
    response.status,
    error?.details,
    payload?.meta?.requestId,
  )
}
