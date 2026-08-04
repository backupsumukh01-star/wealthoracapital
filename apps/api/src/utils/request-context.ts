import type { Request } from 'express'

export function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  return req.ip ?? null
}

export function requestContext(req: Request) {
  return {
    ip: clientIp(req),
    userAgent: req.get('user-agent') ?? null,
  }
}
