import { ERROR_CODES, type ApiResponse } from '@meridian/shared'

import { clearRememberedCsrfToken, ensureCsrfToken, rememberCsrfToken } from './csrf'
import { env } from './env'

/**
 * The single fetch wrapper. Components never call `fetch` directly — they go through a feature
 * hook, which goes through a feature api module (or a `@/services/*` domain service), which
 * goes through here (docs/02 §4).
 *
 * Wired against the live API: cookie-based auth, the response envelope, and the single-flight
 * silent-refresh guard on `401 TOKEN_EXPIRED` all match docs/05 and docs/08.
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
  /** Internal: one CSRF re-bootstrap after CSRF_REJECTED. */
  skipCsrfRetry?: boolean
  /** Override default request timeout (ms). */
  timeoutMs?: number
}

/**
 * A dashboard firing six parallel queries when the access token expires must produce one
 * refresh call, not six racing rotations that trigger reuse detection against each other
 * (docs/08 §5).
 */
let refreshInFlight: Promise<boolean> | null = null

const DEFAULT_TIMEOUT_MS = 30_000

function isMutatingMethod(method: string | undefined): boolean {
  const m = (method ?? 'GET').toUpperCase()
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS'
}

async function refreshSession(): Promise<boolean> {
  const csrf = await ensureCsrfToken()
  refreshInFlight ??= fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
  })
    .then(async (response) => {
      if (!response.ok) return false
      try {
        const payload = (await response.json()) as {
          success?: boolean
          data?: { csrfToken?: string }
        }
        if (payload?.data?.csrfToken) rememberCsrfToken(payload.data.csrfToken)
      } catch {
        // Cookie may still have been rotated via Set-Cookie.
      }
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const external = init.signal
  if (external) {
    if (external.aborted) {
      controller.abort()
    } else {
      external.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    idempotencyKey,
    skipRefresh,
    skipCsrfRetry,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...rest
  } = options

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError(
      ERROR_CODES.NETWORK_ERROR,
      'You appear to be offline. Reconnect and try again.',
      0,
    )
  }

  if (isMutatingMethod(rest.method)) {
    await ensureCsrfToken()
  }
  const csrf = await ensureCsrfToken()

  let response: Response
  try {
    response = await fetchWithTimeout(
      `${env.NEXT_PUBLIC_API_URL}${path}`,
      {
        ...rest,
        // Auth travels as httpOnly cookies, never as a bearer token in JS.
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      timeoutMs,
    )
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    throw new ApiError(
      ERROR_CODES.NETWORK_ERROR,
      aborted
        ? 'The request timed out. Please try again.'
        : 'We could not reach the server. Check your connection and try again.',
      0,
    )
  }

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.ok && payload?.success) {
    const data = payload.data as T & { csrfToken?: string }
    if (data && typeof data === 'object' && 'csrfToken' in data && typeof data.csrfToken === 'string') {
      rememberCsrfToken(data.csrfToken)
    }
    return payload.data
  }

  const error = payload && !payload.success ? payload.error : null
  const code = error?.code ?? ERROR_CODES.INTERNAL_ERROR

  // CSRF cookie may be host-only on the API after Google OAuth — re-bootstrap once.
  if (response.status === 403 && code === 'CSRF_REJECTED' && !skipCsrfRetry) {
    clearRememberedCsrfToken()
    const fresh = await ensureCsrfToken(true)
    if (!fresh) {
      throw new ApiError(
        code,
        error?.message ?? 'Missing or invalid CSRF token.',
        response.status,
        error?.details,
        payload?.meta?.requestId,
      )
    }
    return apiClient<T>(path, { ...options, skipCsrfRetry: true })
  }

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
