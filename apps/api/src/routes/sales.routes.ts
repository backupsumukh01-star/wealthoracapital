import { Router } from 'express'

import { salesAuthController } from '../controllers/sales-auth.controller.js'
import { salesNetworkController } from '../controllers/sales-network.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { authenticateSales, optionalAuthenticateSales } from '../middlewares/authenticate-sales.js'
import { authRateLimiter } from '../middlewares/rate-limit.js'
import { requireAdminAccess } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { salesmanIdParamSchema, salesLoginSchema } from '../validators/sales.validators.js'

export const salesRouter = Router()

salesRouter.post(
  '/auth/login',
  authRateLimiter,
  validate(salesLoginSchema),
  salesAuthController.login,
)

salesRouter.post('/auth/logout', optionalAuthenticateSales, salesAuthController.logout)

salesRouter.post('/auth/refresh', salesAuthController.refresh)

salesRouter.get('/me', authenticateSales, salesAuthController.me)

salesRouter.get('/me/network', authenticateSales, salesNetworkController.meNetwork)
salesRouter.get('/me/network/members', authenticateSales, salesNetworkController.meMembers)
salesRouter.get('/me/network/summary', authenticateSales, salesNetworkController.meSummary)

salesRouter.get('/owner/salesmen', authenticate, requireAdminAccess, salesNetworkController.ownerSalesmen)

salesRouter.get(
  '/owner/salesmen/:salesmanId/network',
  authenticate,
  requireAdminAccess,
  validate(salesmanIdParamSchema, 'params'),
  salesNetworkController.ownerNetwork,
)

salesRouter.get(
  '/owner/salesmen/:salesmanId/network/members',
  authenticate,
  requireAdminAccess,
  validate(salesmanIdParamSchema, 'params'),
  salesNetworkController.ownerMembers,
)

salesRouter.get(
  '/owner/salesmen/:salesmanId/network/summary',
  authenticate,
  requireAdminAccess,
  validate(salesmanIdParamSchema, 'params'),
  salesNetworkController.ownerSummary,
)
