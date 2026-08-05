import type { NextFunction, Request, Response } from 'express'

import { COOKIE_NAMES } from '../config/cookies.js'
import { env } from '../config/env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

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

  const cookieToken = req.cookies?.[COOKIE_NAMES.csrf] as string | undefined
  const headerToken = (req.get('x-csrf-token') ?? '').trim() || undefined

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
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
