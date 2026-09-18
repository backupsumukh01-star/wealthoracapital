import type { Request, Response, NextFunction } from 'express'

import { ERROR_CODES } from '@meridian/shared'

import { AppError } from '../utils/errors.js'

/**
 * Sales Portal is reporting-only after auth. Login/logout/refresh stay allowed.
 */
export function rejectSalesMutations(req: Request, _res: Response, next: NextFunction) {
  if (req.path.startsWith('/auth')) {
    next()
    return
  }
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next()
    return
  }
  next(
    new AppError(
      405,
      ERROR_CODES.FORBIDDEN,
      'Sales Portal is read-only. Customer and finance mutations are not allowed.',
    ),
  )
}
