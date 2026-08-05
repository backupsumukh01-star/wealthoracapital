import { describe, expect, it } from 'vitest'

import { env } from '../config/env.js'
import { sanitizeOAuthRedirect } from '../services/google-oauth.service.js'

describe('sanitizeOAuthRedirect', () => {
  it('allows APP_URL oauth callback', () => {
    const ok = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback`
    expect(sanitizeOAuthRedirect(ok)).toBe(ok)
  })

  it('rejects open redirects', () => {
    const fallback = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback`
    expect(sanitizeOAuthRedirect('https://evil.example/oauth/callback')).toBe(fallback)
    expect(sanitizeOAuthRedirect('https://evil.example/')).toBe(fallback)
    expect(sanitizeOAuthRedirect('javascript:alert(1)')).toBe(fallback)
  })
})
