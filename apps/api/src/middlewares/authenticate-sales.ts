import { ERROR_CODES } from '@meridian/shared'

import { SALES_COOKIE_NAMES } from '../config/sales-cookies.js'
import { prisma } from '../database/prisma.js'
import { salesTokenService } from '../services/sales-token.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { unauthorized } from '../utils/errors.js'
import type { NextFunction, Request, Response } from 'express'

/**
 * Sales Portal auth only. Reads wealthora_sales_at. Never uses mfx_at
 * and never calls the investor authenticate middleware.
 */
export const authenticateSales = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[SALES_COOKIE_NAMES.accessToken] as string | undefined
  if (!token) {
    throw unauthorized('Authentication required.')
  }

  let payload
  try {
    payload = salesTokenService.verifyAccessToken(token)
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw unauthorized('Access token expired.', ERROR_CODES.TOKEN_EXPIRED)
    }
    throw unauthorized('Invalid or expired access token.', ERROR_CODES.UNAUTHENTICATED)
  }

  const session = await prisma.salesmanSession.findUnique({ where: { id: payload.sid } })
  if (
    !session ||
    session.salesmanId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw unauthorized('Session expired. Please sign in again.', ERROR_CODES.UNAUTHENTICATED)
  }

  const salesman = await prisma.salesman.findUnique({ where: { id: payload.sub } })
  if (!salesman) {
    throw unauthorized('Account not found.', ERROR_CODES.UNAUTHENTICATED)
  }
  if (salesman.status === 'DISABLED') {
    throw unauthorized('Account is not allowed to sign in.', ERROR_CODES.ACCOUNT_SUSPENDED)
  }

  req.salesman = {
    id: salesman.id,
    email: salesman.email,
    name: salesman.name,
    code: salesman.code,
    status: salesman.status,
    sessionId: session.id,
  }
  next()
})

export function optionalAuthenticateSales(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SALES_COOKIE_NAMES.accessToken] as string | undefined
  if (!token) {
    next()
    return
  }

  void (async () => {
    try {
      const payload = salesTokenService.verifyAccessToken(token)
      const session = await prisma.salesmanSession.findUnique({ where: { id: payload.sid } })
      if (
        !session ||
        session.salesmanId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        next()
        return
      }
      const salesman = await prisma.salesman.findUnique({ where: { id: payload.sub } })
      if (!salesman || salesman.status === 'DISABLED') {
        next()
        return
      }
      req.salesman = {
        id: salesman.id,
        email: salesman.email,
        name: salesman.name,
        code: salesman.code,
        status: salesman.status,
        sessionId: session.id,
      }
    } catch {
      // Optional auth ignores invalid tokens.
    }
    next()
  })()
}
