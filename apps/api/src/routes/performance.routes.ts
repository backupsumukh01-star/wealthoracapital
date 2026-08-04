import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { tradingController } from '../controllers/trading.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { seriesQuerySchema } from '../validators/trading.validators.js'

export const performanceRouter = Router()

performanceRouter.get('/public', tradingController.performancePublic)

performanceRouter.use(authenticate)

performanceRouter.get(
  '/summary',
  requirePermission(PERMISSIONS['performance.view']),
  tradingController.performanceSummary,
)
performanceRouter.get(
  '/series',
  requirePermission(PERMISSIONS['performance.view']),
  validate(seriesQuerySchema, 'query'),
  tradingController.performanceSeries,
)
performanceRouter.get(
  '/monthly',
  requirePermission(PERMISSIONS['performance.view']),
  tradingController.performanceMonthly,
)
performanceRouter.get(
  '/yearly',
  requirePermission(PERMISSIONS['performance.view']),
  tradingController.performanceYearly,
)
performanceRouter.get(
  '/distributions',
  requirePermission(PERMISSIONS['performance.view']),
  tradingController.performanceDistributions,
)
