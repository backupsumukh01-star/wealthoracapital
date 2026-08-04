import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { financeController } from '../controllers/finance.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'

export const transactionRouter = Router()

transactionRouter.use(authenticate)

transactionRouter.get(
  '/',
  requirePermission(PERMISSIONS['wallet.view']),
  financeController.transactions,
)
