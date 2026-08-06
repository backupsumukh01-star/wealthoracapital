import type { Request, Response } from 'express'

import { APP_VERSION } from '../config/constants.js'
import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { metricsText } from '../observability/metrics.js'
import { pingRedis } from '../services/redis/client.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

export const healthController = {
  health: asyncHandler(async (_req: Request, res: Response) => {
    let database: 'up' | 'down' = 'down'
    try {
      await prisma.$queryRaw`SELECT 1`
      database = 'up'
    } catch {
      database = 'down'
    }
    const redis = await pingRedis()
    const healthy = database === 'up'
    sendSuccess(
      res,
      {
        status: healthy ? 'ok' : 'degraded',
        database,
        redis,
        jobDriver: env.JOB_DRIVER,
        cacheDriver: env.CACHE_DRIVER,
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
      },
      healthy ? 200 : 503,
    )
  }),

  /** Kubernetes-style liveness — process is up. */
  live: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'alive' })
  }),

  /** Readiness — DB (and Redis when required) must be reachable. */
  ready: asyncHandler(async (_req: Request, res: Response) => {
    let database: 'up' | 'down' = 'down'
    try {
      await prisma.$queryRaw`SELECT 1`
      database = 'up'
    } catch {
      database = 'down'
    }
    const redis = await pingRedis()
    const redisOk = !env.REDIS_REQUIRED || redis === 'up' || redis === 'disabled'
    const ready = database === 'up' && redisOk
    sendSuccess(
      res,
      { status: ready ? 'ready' : 'not_ready', database, redis },
      ready ? 200 : 503,
    )
  }),

  metrics: asyncHandler(async (req: Request, res: Response) => {
    if (env.METRICS_TOKEN) {
      const auth = req.get('authorization') ?? ''
      const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      const queryToken = typeof req.query.token === 'string' ? req.query.token : ''
      if (bearer !== env.METRICS_TOKEN && queryToken !== env.METRICS_TOKEN) {
        res.status(401).type('text/plain').send('Unauthorized')
        return
      }
    } else if (env.NODE_ENV === 'production') {
      res.status(404).type('text/plain').send('Not found')
      return
    }
    const body = await metricsText()
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.status(200).send(body)
  }),

  version: asyncHandler(async (_req: Request, res: Response) => {
    const snap = (await import('../observability/process-stability.js')).processStability.snapshot()
    res.setHeader('Cache-Control', 'no-store')
    sendSuccess(res, {
      name: env.APP_NAME,
      version: APP_VERSION,
      buildVersion: APP_VERSION,
      commit: snap.gitCommit,
      branch: process.env.RENDER_GIT_BRANCH ?? process.env.GIT_BRANCH ?? 'local',
      deployedAt: snap.lastDeployment,
      api: 'v1',
      node: process.version,
      uptimeSeconds: snap.uptimeSeconds,
      restartCount: snap.restartCount,
    })
  }),
}
