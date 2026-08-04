import { ERROR_CODES } from '@meridian/shared'
import type { NextFunction, Request, Response } from 'express'

import { COOKIE_NAMES } from '../config/cookies.js'
import { tokenService } from '../services/token.service.js'
import { unauthorized } from '../utils/errors.js'

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.[COOKIE_NAMES.accessToken] as string | undefined
    if (!token) {
      throw unauthorized('Authentication required.')
    }

    const payload = tokenService.verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      email: '',
      role: payload.role,
      staffRole: payload.staffRole,
      sessionId: payload.sid,
    }
    next()
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(unauthorized('Access token expired.', ERROR_CODES.TOKEN_EXPIRED))
      return
    }
    next(unauthorized('Invalid or expired access token.', ERROR_CODES.UNAUTHENTICATED))
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAMES.accessToken] as string | undefined
  if (!token) {
    next()
    return
  }

  try {
    const payload = tokenService.verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      email: '',
      role: payload.role,
      staffRole: payload.staffRole,
      sessionId: payload.sid,
    }
  } catch {
    // Optional auth ignores invalid tokens and continues anonymously.
  }
  next()
}
