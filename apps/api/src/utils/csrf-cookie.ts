import type { Response } from 'express'

import {
  COOKIE_NAMES,
  clearAllCsrfCookieVariants,
  csrfCookieOptions,
} from '../config/cookies.js'
import { tokenService } from '../services/token.service.js'

/** Default lifetime for anonymously issued CSRF cookies (aligned with refresh window). */
export const DEFAULT_CSRF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Issues a readable double-submit CSRF cookie (`mfx_csrf`) and returns the token.
 * Safe to call from GET handlers (docs, /api/v1/csrf) before any mutating request.
 */
export function issueCsrfCookie(
  res: Response,
  maxAgeMs: number = DEFAULT_CSRF_MAX_AGE_MS,
): string {
  const token = tokenService.createCsrfToken()
  clearAllCsrfCookieVariants(res)
  res.cookie(COOKIE_NAMES.csrf, token, csrfCookieOptions(maxAgeMs))
  return token
}
