import type { NextFunction, Request, Response } from 'express'

import { httpRequestDuration, httpRequestTotal } from '../observability/metrics.js'

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!httpRequestDuration || !httpRequestTotal) {
    next()
    return
  }
  const end = httpRequestDuration.startTimer()
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    }
    end(labels)
    httpRequestTotal!.inc(labels)
  })
  next()
}
