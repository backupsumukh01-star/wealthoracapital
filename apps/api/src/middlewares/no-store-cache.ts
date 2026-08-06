import type { NextFunction, Request, Response } from 'express'

/**
 * Dynamic API responses must never be cached by browsers, CDNs, or shared proxies.
 * Auth, wallet, notifications, and dashboard data are always private + fresh.
 */
export function noStoreCacheMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Surrogate-Control', 'no-store')
  next()
}
