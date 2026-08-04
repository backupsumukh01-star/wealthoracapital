import { Router } from 'express'

import { adminDashboardController } from '../controllers/admin-dashboard.controller.js'
import { adminOpsMetricsController } from '../controllers/admin-ops-metrics.controller.js'
import { adminUsersController } from '../controllers/admin-users.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { PERMISSIONS } from '../config/permissions.js'
import { requireAdminAccess, requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { adminAnnouncementsRouter } from './admin-announcements.routes.js'
import { adminBroadcastsRouter } from './admin-broadcasts.routes.js'
import { adminEmailsRouter } from './admin-emails.routes.js'
import { adminFinanceRouter } from './admin-finance.routes.js'
import { adminKycRouter } from './admin-kyc.routes.js'
import { adminMediaRouter } from './admin-media.routes.js'
import { adminReportsRouter } from './admin-reports.routes.js'
import { adminSettingsRouter } from './admin-settings.routes.js'
import { adminSupportRouter } from './admin-support.routes.js'
import { adminTradingRouter } from './admin-trading.routes.js'
import {
  adminActivityQuerySchema,
  adminAuditQuerySchema,
  adminStatusReasonSchema,
  adminUpdateUserSchema,
  adminUserListQuerySchema,
  idParamSchema,
} from '../validators/admin.validators.js'

export const adminRouter = Router()

adminRouter.use(authenticate, requireAdminAccess)

adminRouter.get(
  '/dashboard',
  requirePermission(PERMISSIONS['dashboard.view']),
  adminDashboardController.summary,
)

adminRouter.get(
  '/activity',
  requirePermission(PERMISSIONS['activity.view']),
  validate(adminActivityQuerySchema, 'query'),
  adminDashboardController.activity,
)

adminRouter.get(
  '/audit',
  requirePermission(PERMISSIONS['audit.view']),
  validate(adminAuditQuerySchema, 'query'),
  adminDashboardController.audit,
)

adminRouter.get(
  '/roles',
  requirePermission(PERMISSIONS['roles.view']),
  adminDashboardController.roles,
)

adminRouter.get(
  '/users',
  requirePermission(PERMISSIONS['users.view']),
  validate(adminUserListQuerySchema, 'query'),
  adminUsersController.list,
)

adminRouter.get(
  '/users/:id',
  requirePermission(PERMISSIONS['users.view']),
  validate(idParamSchema, 'params'),
  adminUsersController.get,
)

adminRouter.patch(
  '/users/:id',
  requirePermission(PERMISSIONS['users.edit']),
  validate(idParamSchema, 'params'),
  validate(adminUpdateUserSchema),
  adminUsersController.update,
)

adminRouter.post(
  '/users/:id/disable',
  requirePermission(PERMISSIONS['users.suspend']),
  validate(idParamSchema, 'params'),
  validate(adminStatusReasonSchema),
  adminUsersController.disable,
)

adminRouter.post(
  '/users/:id/enable',
  requirePermission(PERMISSIONS['users.suspend']),
  validate(idParamSchema, 'params'),
  validate(adminStatusReasonSchema),
  adminUsersController.enable,
)

adminRouter.post(
  '/users/:id/suspend',
  requirePermission(PERMISSIONS['users.suspend']),
  validate(idParamSchema, 'params'),
  validate(adminStatusReasonSchema),
  adminUsersController.suspend,
)

adminRouter.post(
  '/users/:id/block',
  requirePermission(PERMISSIONS['users.suspend']),
  validate(idParamSchema, 'params'),
  validate(adminStatusReasonSchema),
  adminUsersController.block,
)

adminRouter.post(
  '/users/:id/delete',
  requirePermission(PERMISSIONS['users.delete']),
  validate(idParamSchema, 'params'),
  validate(adminStatusReasonSchema),
  adminUsersController.remove,
)
adminRouter.delete(
  '/users/:id',
  requirePermission(PERMISSIONS['users.delete']),
  validate(idParamSchema, 'params'),
  validate(adminStatusReasonSchema),
  adminUsersController.remove,
)

adminRouter.post(
  '/users/:id/restore',
  requirePermission(PERMISSIONS['users.restore']),
  validate(idParamSchema, 'params'),
  adminUsersController.restore,
)

adminRouter.post(
  '/users/:id/force-logout',
  requirePermission(PERMISSIONS['users.suspend']),
  validate(idParamSchema, 'params'),
  adminUsersController.forceLogout,
)

adminRouter.get(
  '/ops/metrics',
  requirePermission(PERMISSIONS['dashboard.view']),
  adminOpsMetricsController.summary,
)

adminRouter.use('/kyc', adminKycRouter)
adminRouter.use(adminFinanceRouter)
adminRouter.use(adminTradingRouter)
adminRouter.use('/media', adminMediaRouter)
adminRouter.use('/support', adminSupportRouter)
adminRouter.use(adminSettingsRouter)
adminRouter.use('/reports', adminReportsRouter)
adminRouter.use('/broadcasts', adminBroadcastsRouter)
adminRouter.use('/announcements', adminAnnouncementsRouter)
adminRouter.use(adminEmailsRouter)
