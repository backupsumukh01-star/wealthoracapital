import { Router } from 'express'

import { authRouter } from './auth.routes.js'
import { healthRouter } from './health.routes.js'
import { usersRouter } from './users.routes.js'

/**
 * Mounted at `/api` by the app factory.
 * Produces:
 * - GET  /api/health
 * - GET  /api/version
 * - *    /api/v1/auth/*
 * - *    /api/v1/users/*
 */
export function createApiRouter(): Router {
  const router = Router()

  router.use(healthRouter)
  router.use('/v1/auth', authRouter)
  router.use('/v1/users', usersRouter)

  return router
}
