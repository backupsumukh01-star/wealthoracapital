import { ERROR_CODES } from '@meridian/shared'
import type { NextFunction, Request, Response } from 'express'

import { COOKIE_NAMES } from '../config/cookies.js'
import { resolvePermissions } from '../config/permissions.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { tokenService } from '../services/token.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { unauthorized } from '../utils/errors.js'

/**
 * Validates access JWT, ensures the refresh session is still active, and loads
 * live role/staffRole from the database (so role changes take effect immediately
 * after sessions are revoked).
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAMES.accessToken] as string | undefined
  if (!token) {
    throw unauthorized('Authentication required.')
  }

  let payload
  try {
    payload = tokenService.verifyAccessToken(token)
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw unauthorized('Access token expired.', ERROR_CODES.TOKEN_EXPIRED)
    }
    throw unauthorized('Invalid or expired access token.', ERROR_CODES.UNAUTHENTICATED)
  }

  const session = await sessionRepository.findById(payload.sid)
  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw unauthorized('Session expired. Please sign in again.', ERROR_CODES.UNAUTHENTICATED)
  }

  const user = await userRepository.findById(payload.sub)
  if (!user) {
    throw unauthorized('Account not found.', ERROR_CODES.UNAUTHENTICATED)
  }
  if (user.status === 'SUSPENDED' || user.status === 'BLOCKED' || user.status === 'CLOSED' || user.status === 'ARCHIVED') {
    throw unauthorized('Account is not allowed to sign in.', ERROR_CODES.ACCOUNT_SUSPENDED)
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    staffRole: user.staffRole,
    sessionId: session.id,
    permissions: resolvePermissions({ role: user.role, staffRole: user.staffRole }),
  }
  next()
})

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAMES.accessToken] as string | undefined
  if (!token) {
    next()
    return
  }

  void (async () => {
    try {
      const payload = tokenService.verifyAccessToken(token)
      const session = await sessionRepository.findById(payload.sid)
      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        next()
        return
      }
      const user = await userRepository.findById(payload.sub)
      if (!user) {
        next()
        return
      }
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        staffRole: user.staffRole,
        sessionId: session.id,
        permissions: resolvePermissions({ role: user.role, staffRole: user.staffRole }),
      }
    } catch {
      // Optional auth ignores invalid tokens.
    }
    next()
  })()
}
