import type { NextFunction, Request, Response } from 'express'

import { COOKIE_NAMES } from '../config/cookies.js'
import { env } from '../config/env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

/** Collect every value for a cookie name (browsers may send host-only + Domain duplicates). */
function cookieValues(req: Request, name: string): string[] {
  const raw = req.headers.cookie
  if (!raw) return []
  const values: string[] = []
  for (const part of raw.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(`${name}=`)) continue
    const value = trimmed.slice(name.length + 1)
    if (value) values.push(decodeURIComponent(value))
  }
  return values
}

/**
 * Double-submit CSRF for cookie-authenticated mutating requests.
 * Skips when no access-token cookie is present (login/register/public).
 * Disabled in test by default (`CSRF_PROTECTION`); enable explicitly to assert.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!env.CSRF_PROTECTION) {
    next()
    return
  }

  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next()
    return
  }

  const accessToken = req.cookies?.[COOKIE_NAMES.accessToken] as string | undefined
  if (!accessToken) {
    next()
    return
  }

  const headerToken = (req.get('x-csrf-token') ?? '').trim() || undefined
  const parsed = req.cookies?.[COOKIE_NAMES.csrf] as string | undefined
  const allCookieTokens = cookieValues(req, COOKIE_NAMES.csrf)
  const candidates = new Set(
    [parsed, ...allCookieTokens].filter((value): value is string => Boolean(value?.trim())),
  )

  if (!headerToken || candidates.size === 0 || !candidates.has(headerToken)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_REJECTED',
        message: 'Missing or invalid CSRF token.',
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    })
    return
  }

  next()
}
