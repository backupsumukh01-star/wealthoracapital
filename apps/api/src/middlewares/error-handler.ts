import { ERROR_CODES } from '@meridian/shared'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { sendFailure } from '../utils/response.js'

export function notFoundHandler(req: Request, res: Response): void {
  sendFailure(res, 404, ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} was not found.`)
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && 'body' in err) {
    sendFailure(
      res,
      400,
      ERROR_CODES.VALIDATION_ERROR,
      'Invalid JSON payload.',
      undefined,
      req.requestId,
    )
    return
  }

  if (err instanceof AppError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId }, err.message)
    } else {
      logger.warn({ err, requestId: req.requestId, code: err.code }, err.message)
    }
    sendFailure(res, err.statusCode, err.code, err.message, err.details, req.requestId)
    return
  }

  if (err instanceof ZodError) {
    sendFailure(
      res,
      400,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed.',
      {
        issues: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      req.requestId,
    )
    return
  }

  logger.error({ err, requestId: req.requestId }, 'Unhandled error')
  sendFailure(
    res,
    500,
    ERROR_CODES.INTERNAL_ERROR,
    'An unexpected error occurred.',
    undefined,
    req.requestId,
  )
}
