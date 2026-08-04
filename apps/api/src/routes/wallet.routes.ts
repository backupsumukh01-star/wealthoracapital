import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { financeController } from '../controllers/finance.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'

export const walletRouter = Router()

walletRouter.use(authenticate)

walletRouter.get('/', requirePermission(PERMISSIONS['wallet.view']), financeController.walletGet)
walletRouter.get(
  '/summary',
  requirePermission(PERMISSIONS['wallet.view']),
  financeController.walletSummary,
)
walletRouter.get(
  '/transactions',
  requirePermission(PERMISSIONS['wallet.view']),
  financeController.walletTransactions,
)
walletRouter.get(
  '/history',
  requirePermission(PERMISSIONS['wallet.view']),
  financeController.walletHistory,
)
