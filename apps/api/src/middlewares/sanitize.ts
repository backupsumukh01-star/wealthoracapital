import type { NextFunction, Request, Response } from 'express'

function stripPrototypeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripPrototypeKeys)
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue
      }
      result[key] = stripPrototypeKeys(nested)
    }
    return result
  }

  return value
}

/** Removes dangerous prototype-pollution keys from JSON bodies and query objects. */
export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = stripPrototypeKeys(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    const cleaned = stripPrototypeKeys(req.query)
    for (const key of Object.keys(req.query)) {
      delete (req.query as Record<string, unknown>)[key]
    }
    Object.assign(req.query, cleaned)
  }
  next()
}
