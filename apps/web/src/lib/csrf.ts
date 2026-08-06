import { env } from './env'

/** Readable double-submit cookie name (must match API `COOKIE_NAMES.csrf`). */
const CSRF_COOKIE = 'mfx_csrf'

/** In-memory fallback when the cookie is host-scoped to the API subdomain. */
let memoryCsrfToken: string | undefined
let csrfBootstrapInFlight: Promise<string | undefined> | null = null

/** Read the non-httpOnly double-submit CSRF cookie set by the API (when Domain allows). */
export function readCsrfCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return value ? decodeURIComponent(value) : undefined
}

export function rememberCsrfToken(token: string | undefined): void {
  if (token?.trim()) memoryCsrfToken = token.trim()
}

export function clearRememberedCsrfToken(): void {
  memoryCsrfToken = undefined
}

export function getCsrfToken(): string | undefined {
  return readCsrfCookie() ?? memoryCsrfToken
}

export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken()
  return token ? { 'X-CSRF-Token': token } : {}
}

/**
 * Ensures we have a CSRF token for mutating API calls.
 * Google OAuth sets cookies on the API host; JS on the marketing/app origin cannot
 * read host-only cookies, so we bootstrap via GET /csrf (JSON body + Set-Cookie).
 */
export async function ensureCsrfToken(force = false): Promise<string | undefined> {
  if (!force) {
    const existing = getCsrfToken()
    if (existing) return existing
  }

  if (csrfBootstrapInFlight) return csrfBootstrapInFlight

  csrfBootstrapInFlight = fetch(`${env.NEXT_PUBLIC_API_URL}/csrf`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) return getCsrfToken()
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        data?: { csrfToken?: string }
      } | null
      const token = payload?.data?.csrfToken?.trim()
      if (token) {
        rememberCsrfToken(token)
        return token
      }
      return getCsrfToken()
    })
    .catch(() => getCsrfToken())
    .finally(() => {
      csrfBootstrapInFlight = null
    })

  return csrfBootstrapInFlight
}
