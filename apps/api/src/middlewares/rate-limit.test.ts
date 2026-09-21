import { describe, expect, it } from 'vitest'
import type { Request } from 'express'

import {
  clientRateLimitKey,
  isDedicatedAuthPath,
  requestPath,
  shouldSkipGlobalRateLimit,
} from './rate-limit.js'

function fakeReq(partial: {
  originalUrl?: string
  url?: string
  path?: string
  method?: string
  headers?: Record<string, string | string[] | undefined>
  ip?: string
}): Request {
  return {
    originalUrl: partial.originalUrl,
    url: partial.url,
    path: partial.path,
    method: partial.method ?? 'GET',
    headers: partial.headers ?? {},
    ip: partial.ip,
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request
}

describe('rate-limit skip / key helpers', () => {
  it('strips query strings from the request path', () => {
    expect(requestPath(fakeReq({ originalUrl: '/api/v1/auth/google/callback?code=x&state=y' }))).toBe(
      '/api/v1/auth/google/callback',
    )
  })

  it('keys by Express req.ip (trusted proxy), never an empty key, and ignores spoofed X-Forwarded-For', () => {
    expect(
      clientRateLimitKey(
        fakeReq({ headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }, ip: '10.0.0.1' }),
      ),
    ).toBe('10.0.0.1')
    expect(clientRateLimitKey(fakeReq({ ip: undefined }))).toBe('127.0.0.1')
    expect(clientRateLimitKey(fakeReq({ ip: '   ' }))).toBe('127.0.0.1')
  })

  it('treats login, register, Google OAuth, reset, verify, and sales login as dedicated auth paths', () => {
    expect(isDedicatedAuthPath('/api/v1/auth/login')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/register')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/google')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/google/callback')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/forgot-password')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/reset-password')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/verify-email')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/sales/auth/login')).toBe(true)
    expect(isDedicatedAuthPath('/api/v1/auth/me')).toBe(false)
    expect(isDedicatedAuthPath('/api/v1/admin/returns')).toBe(false)
  })

  it('skips global limiter for CSRF bootstrap and auth endpoints without a session cookie', () => {
    expect(shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/csrf' }))).toBe(true)
    expect(shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/auth/login', method: 'POST' }))).toBe(
      true,
    )
    expect(shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/auth/google' }))).toBe(true)
    expect(
      shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/auth/google/callback?code=1' })),
    ).toBe(true)
    expect(shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/settings/public' }))).toBe(false)
  })

  it('skips global limiter for authenticated Daily Return and other admin console paths', () => {
    const headers = { cookie: 'mfx_at=session; mfx_csrf=token' }
    expect(
      shouldSkipGlobalRateLimit(
        fakeReq({ originalUrl: '/api/v1/admin/returns', method: 'POST', headers }),
      ),
    ).toBe(true)
    expect(
      shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/admin/returns', method: 'POST' })),
    ).toBe(false)
  })

  it('never rate-limits CORS preflight', () => {
    expect(
      shouldSkipGlobalRateLimit(fakeReq({ originalUrl: '/api/v1/settings/public', method: 'OPTIONS' })),
    ).toBe(true)
  })
})
