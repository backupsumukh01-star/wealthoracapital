import { Router } from 'express'

import { salesAdminController } from '../controllers/sales-admin.controller.js'
import { salesAuthController } from '../controllers/sales-auth.controller.js'
import { salesNetworkController } from '../controllers/sales-network.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { authenticateSales, optionalAuthenticateSales } from '../middlewares/authenticate-sales.js'
import { loginRateLimiter } from '../middlewares/rate-limit.js'
import { requireAdminAccess } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { rejectSalesMutations } from '../middlewares/reject-sales-mutations.js'
import {
  createSalesmanSchema,
  ownerNetworkUserParamSchema,
  salesmanIdParamSchema,
  salesLoginSchema,
  salesNetworkUserIdParamSchema,
  updateSalesmanSchema,
} from '../validators/sales.validators.js'

export const salesRouter = Router()

salesRouter.post(
  '/auth/login',
  loginRateLimiter,
  validate(salesLoginSchema),
  salesAuthController.login,
)

salesRouter.post('/auth/logout', optionalAuthenticateSales, salesAuthController.logout)

salesRouter.post('/auth/refresh', salesAuthController.refresh)

salesRouter.post(
  '/owner/salesmen',
  authenticate,
  requireAdminAccess,
  validate(createSalesmanSchema),
  salesAdminController.create,
)

salesRouter.patch(
  '/owner/salesmen/:salesmanId',
  authenticate,
  requireAdminAccess,
  validate(salesmanIdParamSchema, 'params'),
  validate(updateSalesmanSchema),
  salesAdminController.update,
)

salesRouter.post(
  '/owner/salesmen/:salesmanId/password',
  authenticate,
  requireAdminAccess,
  validate(salesmanIdParamSchema, 'params'),
  salesAdminController.resetPassword,
)

salesRouter.use(rejectSalesMutations)

salesRouter.get('/me', authenticateSales, salesAuthController.me)
salesRouter.get('/me/network', authenticateSales, salesNetworkController.meNetwork)
salesRouter.get('/me/network/members', authenticateSales, salesNetworkController.meMembers)
salesRouter.get(
  '/me/network/members/:userId',
  authenticateSales,
  validate(salesNetworkUserIdParamSchema, 'params'),
  salesNetworkController.meMemberDetail,
)
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

salesRouter.get(
  '/owner/salesmen/:salesmanId/network/members/:userId',
  authenticate,
  requireAdminAccess,
  validate(ownerNetworkUserParamSchema, 'params'),
  salesNetworkController.ownerMemberDetail,
)