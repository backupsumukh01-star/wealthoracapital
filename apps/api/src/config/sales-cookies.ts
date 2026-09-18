import type { CookieOptions } from 'express'

import { env, isProduction } from './env.js'

export const SALES_COOKIE_NAMES = {
  accessToken: 'wealthora_sales_at',
  refreshToken: 'wealthora_sales_rt',
} as const

const baseSalesCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE || isProduction,
  sameSite: 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
})

export function salesAccessTokenCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseSalesCookieOptions(),
    maxAge: maxAgeMs,
  }
}

export function salesRefreshTokenCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseSalesCookieOptions(),
    path: '/api/v1/sales/auth',
    maxAge: maxAgeMs,
  }
}

export function clearSalesAccessTokenCookieOptions(): CookieOptions {
  return { ...salesAccessTokenCookieOptions(0), maxAge: 0 }
}

export function clearSalesRefreshTokenCookieOptions(): CookieOptions {
  return { ...salesRefreshTokenCookieOptions(0), maxAge: 0 }
}
