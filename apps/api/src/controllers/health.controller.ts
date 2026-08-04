import type { Request, Response } from 'express'

import { APP_VERSION } from '../config/constants.js'
import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
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

    const healthy = database === 'up'
    sendSuccess(
      res,
      {
        status: healthy ? 'ok' : 'degraded',
        database,
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
      },
      healthy ? 200 : 503,
    )
  }),

  version: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, {
      name: env.APP_NAME,
      version: APP_VERSION,
      api: 'v1',
      node: process.version,
    })
  }),
}
