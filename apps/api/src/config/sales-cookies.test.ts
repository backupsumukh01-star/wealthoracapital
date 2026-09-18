import { describe, expect, it } from 'vitest'

import {
  SALES_COOKIE_NAMES,
  salesAccessTokenCookieOptions,
  salesRefreshTokenCookieOptions,
} from './sales-cookies.js'

describe('sales cookie options', () => {
  it('uses isolated cookie names', () => {
    expect(SALES_COOKIE_NAMES.accessToken).toBe('wealthora_sales_at')
    expect(SALES_COOKIE_NAMES.refreshToken).toBe('wealthora_sales_rt')
  })

  it('keeps sales access token HttpOnly with SameSite=Lax', () => {
    const access = salesAccessTokenCookieOptions(60_000)
    expect(access.httpOnly).toBe(true)
    expect(access.sameSite).toBe('lax')
    expect(access.path).toBe('/')
  })

  it('scopes the sales refresh cookie to sales auth routes', () => {
    const refresh = salesRefreshTokenCookieOptions(60_000)
    expect(refresh.httpOnly).toBe(true)
    expect(refresh.sameSite).toBe('lax')
    expect(refresh.path).toBe('/api/v1/sales/auth')
  })
})
