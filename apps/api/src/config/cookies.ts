import type { CookieOptions } from 'express'

import { env, isProduction } from './env.js'

export const COOKIE_NAMES = {
  accessToken: 'mfx_at',
  refreshToken: 'mfx_rt',
  csrf: 'mfx_csrf',
  /** Short-lived nonce for Google OAuth CSRF (httpOnly). */
  oauthState: 'mfx_oauth_state',
} as const

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE || isProduction,
  sameSite: 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
})

export function accessTokenCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseCookieOptions(),
    sameSite: 'lax',
    maxAge: maxAgeMs,
  }
}

/**
 * Refresh cookie — Lax so the OAuth redirect chain (Google → API → web) can
 * establish a session, then `/auth/refresh` works from the SPA origin.
 * Path-scoped to auth routes only.
 */
export function refreshTokenCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseCookieOptions(),
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  }
}

export function csrfCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: false,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
    // When COOKIE_DOMAIN is set (e.g. .growzycapital.com), the readable CSRF
    // cookie is shared across app + API subdomains for double-submit from the web.
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  }
}

export function oauthStateCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseCookieOptions(),
    sameSite: 'lax',
    maxAge: maxAgeMs,
  }
}

export function clearAccessTokenCookieOptions(): CookieOptions {
  return { ...accessTokenCookieOptions(0), maxAge: 0 }
}

export function clearRefreshTokenCookieOptions(): CookieOptions {
  return { ...refreshTokenCookieOptions(0), maxAge: 0 }
}

export function clearCsrfCookieOptions(): CookieOptions {
  return { ...csrfCookieOptions(0), maxAge: 0 }
}

/**
 * Clears both host-only and Domain-scoped `mfx_csrf` cookies.
 * Older deploys without COOKIE_DOMAIN leave a host-only duplicate that
 * shadows the shared Domain cookie and breaks double-submit checks.
 */
export function clearAllCsrfCookieVariants(res: {
  cookie: (name: string, value: string, options: CookieOptions) => unknown
}): void {
  const base = {
    httpOnly: false,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
  res.cookie(COOKIE_NAMES.csrf, '', base)
  if (env.COOKIE_DOMAIN) {
    res.cookie(COOKIE_NAMES.csrf, '', { ...base, domain: env.COOKIE_DOMAIN })
  }
}

export function clearOauthStateCookieOptions(): CookieOptions {
  return { ...oauthStateCookieOptions(0), maxAge: 0 }
}
