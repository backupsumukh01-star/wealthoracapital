import type { NextFunction, Request, Response } from 'express'

import { env } from '../config/env.js'
import { ERROR_CODES } from '@meridian/shared'
import { sendFailure } from '../utils/response.js'
import { processStability } from '../observability/process-stability.js'
import { HISTORICAL_IMPORT_REQUEST_TIMEOUT_MS } from '../services/historical-import-parse.js'

/**
 * Abort long-running requests so a hung handler cannot exhaust the event loop forever.
 * Skips health/metrics endpoints.
 */
export function requestTimeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
    const path = req.originalUrl || req.path || ''
  if (
    path.includes('/health') ||
    path.includes('/metrics') ||
    path.includes('/docs') ||
    path.includes('/openapi')
  ) {
    next()
    return
  }

  const isHistoricalImport = path.includes('/history/import')
  const ms = isHistoricalImport
    ? Math.max(env.REQUEST_TIMEOUT_MS, HISTORICAL_IMPORT_REQUEST_TIMEOUT_MS)
    : env.REQUEST_TIMEOUT_MS
  if (!ms || ms <= 0) {
    next()
    return
  }

  const started = Date.now()
  const timer = setTimeout(() => {
    if (res.headersSent) return
    processStability.recordCrash({
      kind: 'request',
      message: `Request timeout after ${ms}ms: ${req.method} ${req.originalUrl}`,
      service: 'growzy-api',
    })
    sendFailure(
      res,
      504,
      ERROR_CODES.INTERNAL_ERROR,
      'Request timed out. Please try again.',
      undefined,
      req.requestId,
    )
  }, ms)

  res.on('finish', () => {
    clearTimeout(timer)
    processStability.recordRequestLatency(Date.now() - started)
  })
  res.on('close', () => clearTimeout(timer))

  next()
}
