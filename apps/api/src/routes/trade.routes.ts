import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { tradingController } from '../controllers/trading.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { tradeIdParamSchema, tradeListQuerySchema } from '../validators/trading.validators.js'

export const tradeRouter = Router()

tradeRouter.get('/public', tradingController.publicTrades)
tradeRouter.get('/public/stats', tradingController.publicStats)

tradeRouter.use(authenticate)

tradeRouter.get(
  '/',
  requirePermission(PERMISSIONS['trades.view']),
  validate(tradeListQuerySchema, 'query'),
  tradingController.listTrades,
)
tradeRouter.get('/pairs', requirePermission(PERMISSIONS['trades.view']), tradingController.pairs)
tradeRouter.get('/stats', requirePermission(PERMISSIONS['trades.view']), tradingController.stats)
tradeRouter.get(
  '/:id',
  requirePermission(PERMISSIONS['trades.view']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.getTrade,
)
