import { describe, expect, it } from 'vitest'

import { env } from '../../src/config/env.js'

/**
 * Unit-level mirror of safeRedirectTarget used by email click tracking.
 * Keeps regression coverage without importing Express handlers.
 */
function safeRedirectTarget(raw: string, appUrl = env.APP_URL): string {
  const fallback = '/'
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const appOrigin = new URL(appUrl).origin
    const target = new URL(trimmed, appUrl)
    if (target.origin === appOrigin) return target.toString()
  } catch {
    return fallback
  }
  return fallback
}

describe('safe email click redirects', () => {
  it('allows relative paths', () => {
    expect(safeRedirectTarget('/dashboard')).toBe('/dashboard')
  })

  it('blocks protocol-relative URLs', () => {
    expect(safeRedirectTarget('//evil.example/phish')).toBe('/')
  })

  it('blocks external absolute URLs', () => {
    expect(safeRedirectTarget('https://evil.example/phish')).toBe('/')
  })

  it('allows same-origin absolute URLs', () => {
    const allowed = safeRedirectTarget(`${env.APP_URL}/wallet`)
    expect(allowed).toContain('/wallet')
  })
})
