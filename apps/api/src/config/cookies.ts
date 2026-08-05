import type { CookieOptions } from 'express'

import { env, isProduction } from './env.js'

export const COOKIE_NAMES = {
  accessToken: 'mfx_at',
  refreshToken: 'mfx_rt',
  csrf: 'mfx_csrf',
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

export function refreshTokenCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseCookieOptions(),
    sameSite: 'strict',
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
    // When unset, the cookie is host-only (safe default for single-host deploys).
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
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
