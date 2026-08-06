import { describe, expect, it } from 'vitest'

import {
  accessTokenCookieOptions,
  clearAllCsrfCookieVariants,
  csrfCookieOptions,
} from '../config/cookies.js'

describe('auth cookie options', () => {
  it('issues a JS-readable CSRF cookie with SameSite=Lax', () => {
    const csrf = csrfCookieOptions(60_000)
    expect(csrf.httpOnly).toBe(false)
    expect(csrf.sameSite).toBe('lax')
    expect(csrf.path).toBe('/')
  })

  it('keeps access token HttpOnly with SameSite=Lax', () => {
    const access = accessTokenCookieOptions(60_000)
    expect(access.httpOnly).toBe(true)
    expect(access.sameSite).toBe('lax')
  })

  it('clears host-only and Domain CSRF cookie variants', () => {
    const calls: Array<{ name: string; options: Record<string, unknown> }> = []
    clearAllCsrfCookieVariants({
      cookie: (name, _value, options) => {
        calls.push({ name, options: options as Record<string, unknown> })
      },
    })
    expect(calls.length).toBeGreaterThanOrEqual(1)
    expect(calls.every((c) => c.name === 'mfx_csrf')).toBe(true)
    expect(calls.every((c) => c.options.maxAge === 0)).toBe(true)
  })
})
