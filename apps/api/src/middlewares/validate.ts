import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

import { badRequest } from '../utils/errors.js'

type RequestPart = 'body' | 'query' | 'params'

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[part])
    if (!parsed.success) {
      next(
        badRequest('Validation failed.', {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      )
      return
    }

    req[part] = parsed.data
    next()
  }
}
