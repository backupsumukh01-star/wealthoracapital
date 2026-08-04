import type { ApiFailure, ApiSuccess } from '@meridian/shared'
import type { Response } from 'express'

import { randomUUID } from 'node:crypto'

export function createMeta(requestId?: string) {
  return {
    requestId: requestId ?? randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  requestId?: string,
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    meta: createMeta(requestId ?? res.locals.requestId),
  }
  return res.status(status).json(body)
}

export function sendFailure(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
): Response {
  const body: ApiFailure = {
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    meta: createMeta(requestId ?? res.locals.requestId),
  }
  return res.status(status).json(body)
}
