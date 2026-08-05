import { describe, expect, it } from 'vitest'

import { csrfCookieOptions, accessTokenCookieOptions } from '../config/cookies.js'

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
})
