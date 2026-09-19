import { ERROR_CODES } from '@meridian/shared'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'

import { recordSystemLog } from '../observability/log-buffer.js'
import { processStability } from '../observability/process-stability.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { sendFailure } from '../utils/response.js'

const alertCooldown = new Map<string, number>()
const ALERT_MS = 10 * 60_000

function maybeAlert(key: string, run: () => void) {
  const now = Date.now()
  if (now - (alertCooldown.get(key) ?? 0) < ALERT_MS) return
  alertCooldown.set(key, now)
  run()
}

export function notFoundHandler(req: Request, res: Response): void {
  sendFailure(res, 404, ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} was not found.`)
}

function requestContext(req: Request) {
  return {
    requestId: req.requestId,
    userId: req.user?.id ?? null,
    route: `${req.method} ${req.originalUrl}`,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? null,
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const ctx = requestContext(req)

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
      logger.error({ err, ...ctx, stack: err.stack }, err.message)
      recordSystemLog({
        level: 'error',
        message: err.message,
        requestId: req.requestId,
        meta: { ...ctx, code: err.code, statusCode: err.statusCode, stack: err.stack?.slice(0, 1500) },
      })
      processStability.recordCrash({
        kind: 'request',
        message: err.message,
        stack: err.stack,
        service: 'growzy-api',
      })
      maybeAlert(`5xx:${err.code}:${ctx.route}`, () => {
        void import('../services/ops-alert.service.js').then(({ opsAlertService }) =>
          opsAlertService.notify({
            event: 'SYSTEM_ERROR',
            title: 'API 5xx error',
            action: err.message,
            userId: ctx.userId,
            ip: ctx.ip,
            adminPath: '/admin/system-health',
            details: {
              Route: ctx.route,
              'Request ID': ctx.requestId ?? '—',
              Browser: ctx.userAgent,
              'Stack trace': (err.stack ?? '—').slice(0, 1500),
              Time: new Date().toISOString(),
            },
          }),
        )
      })
    } else {
      logger.warn({ err, ...ctx, code: err.code }, err.message)
    }
    sendFailure(res, err.statusCode, err.code, err.message, err.details, req.requestId)
    return
  }

  if (err instanceof multer.MulterError) {
    sendFailure(
      res,
      400,
      ERROR_CODES.VALIDATION_ERROR,
      err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 2MB.' : 'Upload failed.',
      undefined,
      req.requestId,
    )
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

  const message = err instanceof Error ? err.message : 'Unhandled error'
  if (res.headersSent) {
    logger.warn({ err, ...ctx }, 'Error after response was already sent')
    return
  }
  const stack = err instanceof Error ? err.stack : undefined
  logger.error({ err, ...ctx, stack }, 'Unhandled error')
  recordSystemLog({
    level: 'error',
    message,
    requestId: req.requestId,
    meta: { ...ctx, stack: stack?.slice(0, 1500), timestamp: new Date().toISOString() },
  })
  processStability.recordCrash({
    kind: 'request',
    message,
    stack,
    service: 'growzy-api',
  })
  maybeAlert(`unhandled:${ctx.route}`, () => {
    void import('../services/ops-alert.service.js').then(({ opsAlertService }) =>
      opsAlertService.notify({
        event: 'SYSTEM_ERROR',
        title: 'Unhandled API exception',
        action: message,
        userId: ctx.userId,
        ip: ctx.ip,
        adminPath: '/admin/system-health',
        details: {
          Route: ctx.route,
          'Request ID': ctx.requestId ?? '—',
          Browser: ctx.userAgent,
          'Stack trace': (stack ?? '—').slice(0, 1500),
          Time: new Date().toISOString(),
          'Suggested cause': 'Bug in route handler — see stack',
        },
      }),
    )
  })

  sendFailure(
    res,
    500,
    ERROR_CODES.INTERNAL_ERROR,
    'An unexpected error occurred.',
    undefined,
    req.requestId,
  )
}
