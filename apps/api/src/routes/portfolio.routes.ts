import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { tradingController } from '../controllers/trading.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'

export const portfolioRouter = Router()

portfolioRouter.use(authenticate)
portfolioRouter.get(
  '/',
  requirePermission(PERMISSIONS['performance.view']),
  tradingController.portfolio,
)
