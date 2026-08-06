import type { NextFunction, Request, Response } from 'express'

import { httpRequestDuration, httpRequestTotal } from '../observability/metrics.js'
import { processStability } from '../observability/process-stability.js'

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now()
  const end = httpRequestDuration?.startTimer()

  res.on('finish', () => {
    const durationMs = Date.now() - started
    processStability.recordRequestLatency(durationMs)

    if (!end || !httpRequestTotal) return
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    }
    end(labels)
    httpRequestTotal.inc(labels)
  })
  next()
}
