import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { tradingController } from '../controllers/trading.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  allocateTradeSchema,
  adminTradeListQuerySchema,
  closeTradeSchema,
  createTradeSchema,
  publishReturnSchema,
  tradeIdParamSchema,
  updateTradeSchema,
} from '../validators/trading.validators.js'

export const adminTradingRouter = Router()

adminTradingRouter.get(
  '/trades',
  requirePermission(PERMISSIONS['trades.view']),
  validate(adminTradeListQuerySchema, 'query'),
  tradingController.adminListTrades,
)
adminTradingRouter.post(
  '/trades',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(createTradeSchema),
  tradingController.adminCreateTrade,
)
adminTradingRouter.post(
  '/trades/allocate',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(allocateTradeSchema),
  tradingController.adminAllocate,
)
adminTradingRouter.post(
  '/trades/publish',
  requirePermission(PERMISSIONS['trades.manage']),
  tradingController.adminPublishBatch,
)
adminTradingRouter.get(
  '/trades/:id',
  requirePermission(PERMISSIONS['trades.view']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminGetTrade,
)
adminTradingRouter.patch(
  '/trades/:id',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  validate(updateTradeSchema),
  tradingController.adminUpdateTrade,
)
adminTradingRouter.post(
  '/trades/:id/open',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminOpenTrade,
)
adminTradingRouter.post(
  '/trades/:id/close',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  validate(closeTradeSchema),
  tradingController.adminCloseTrade,
)
adminTradingRouter.post(
  '/trades/:id/cancel',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminCancelTrade,
)
adminTradingRouter.post(
  '/trades/:id/archive',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminArchiveTrade,
)
adminTradingRouter.post(
  '/trades/:id/duplicate',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminDuplicateTrade,
)
adminTradingRouter.post(
  '/trades/:id/publish',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminPublishTrade,
)
adminTradingRouter.post(
  '/trades/:id/hide',
  requirePermission(PERMISSIONS['trades.manage']),
  validate(tradeIdParamSchema, 'params'),
  tradingController.adminHideTrade,
)

adminTradingRouter.get(
  '/returns',
  requirePermission(PERMISSIONS['returns.manage']),
  tradingController.adminReturns,
)
adminTradingRouter.post(
  '/returns',
  requirePermission(PERMISSIONS['returns.manage']),
  validate(publishReturnSchema),
  tradingController.adminPublishReturn,
)

adminTradingRouter.get(
  '/performance',
  requirePermission(PERMISSIONS['performance.view']),
  tradingController.adminPerformance,
)
