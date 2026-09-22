import { Router } from 'express'

import { adminDashboardController } from '../controllers/admin-dashboard.controller.js'
import { adminHealthController } from '../controllers/admin-health.controller.js'
import { adminOpsMetricsController } from '../controllers/admin-ops-metrics.controller.js'
import { adminUsersController, handleHistoryImportUpload } from '../controllers/admin-users.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { PERMISSIONS } from '../config/permissions.js'
import { requireAdminAccess, requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { adminAnnouncementsRouter } from './admin-announcements.routes.js'
import { adminBroadcastsRouter } from './admin-broadcasts.routes.js'
import { adminEmailsRouter } from './admin-emails.routes.js'
import { adminFinanceRouter } from './admin-finance.routes.js'
import { adminHandoverRouter } from './admin-handover.routes.js'
import { adminKycRouter } from './admin-kyc.routes.js'
import { adminMediaRouter } from './admin-media.routes.js'
import { adminReferralRouter } from './admin-referral.routes.js'
import { adminReportsRouter } from './admin-reports.routes.js'
import { adminSettingsRouter } from './admin-settings.routes.js'
import { adminSupportRouter } from './admin-support.routes.js'
import { adminTradingRouter } from './admin-trading.routes.js'
import {
  adminActivityQuerySchema,
  adminAuditQuerySchema,
  adminCreateUserSchema,
  adminOpsPeriodQuerySchema,
  adminStatusReasonSchema,
  adminUpdateUserSchema,
  adminUserHistoryCreateSchema,
  adminUserListQuerySchema,
  adminDeletedUsersQuerySchema,
  adminUserNoteSchema,
  idParamSchema,
  adminImportIdParamSchema,
} from '../validators/admin.validators.js'

export const adminRouter = Router()

adminRouter.use(authenticate, requireAdminAccess)

adminRouter.get(
  '/dashboard',
  requirePermission(PERMISSIONS['dashboard.view']),
  adminDashboardController.summary,
)

adminRouter.get(
  '/dashboard/ops',
  requirePermission(PERMISSIONS['dashboard.view']),
  adminDashboardController.ops,
)

adminRouter.get(
  '/dashboard/ops/period',
  requirePermission(PERMISSIONS['dashboard.view']),
  validate(adminOpsPeriodQuerySchema, 'query'),
  adminDashboardController.opsPeriod,
)

adminRouter.get(
  '/health',
  requirePermission(PERMISSIONS['dashboard.view']),
  adminHealthController.snapshot,
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
  '/users/deleted',
  requirePermission(PERMISSIONS['users.delete']),
  validate(adminDeletedUsersQuerySchema, 'query'),
  adminUsersController.listDeleted,
)

adminRouter.post(
  '/users',
  requirePermission(PERMISSIONS['users.edit']),
  validate(adminCreateUserSchema),
  adminUsersController.create,
)

adminRouter.get(
  '/users/:id/history/import/template.csv',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(idParamSchema, 'params'),
  adminUsersController.historyImportTemplateCsv,
)

adminRouter.get(
  '/users/:id/history/import/template.xlsx',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(idParamSchema, 'params'),
  adminUsersController.historyImportTemplateXlsx,
)

adminRouter.post(
  '/users/:id/history/import/preview',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(idParamSchema, 'params'),
  handleHistoryImportUpload,
  adminUsersController.historyImportPreview,
)

adminRouter.get(
  '/users/:id/history/imports',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(idParamSchema, 'params'),
  adminUsersController.historyImports,
)

adminRouter.get(
  '/users/:id/history/imports/:importId',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(adminImportIdParamSchema, 'params'),
  adminUsersController.historyImportGet,
)

adminRouter.post(
  '/users/:id/history/imports/:importId/confirm',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(adminImportIdParamSchema, 'params'),
  adminUsersController.historyImportConfirm,
)

adminRouter.post(
  '/users/:id/history/imports/:importId/cancel',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(adminImportIdParamSchema, 'params'),
  adminUsersController.historyImportCancel,
)

adminRouter.post(
  '/users/:id/history/wipe',
  requirePermission(PERMISSIONS['users.history_import']),
  validate(idParamSchema, 'params'),
  adminUsersController.wipeHistory,
)

adminRouter.get(
  '/users/:id/history',
  requirePermission(PERMISSIONS['users.view']),
  validate(idParamSchema, 'params'),
  adminUsersController.history,
)

adminRouter.post(
  '/users/:id/history',
  requirePermission(PERMISSIONS['finance.adjust']),
  validate(idParamSchema, 'params'),
  validate(adminUserHistoryCreateSchema),
  adminUsersController.createHistory,
)

adminRouter.get(
  '/users/:id',
  requirePermission(PERMISSIONS['users.view']),
  validate(idParamSchema, 'params'),
  adminUsersController.get,
)

adminRouter.post(
  '/users/:id/notes',
  requirePermission(PERMISSIONS['users.edit']),
  validate(idParamSchema, 'params'),
  validate(adminUserNoteSchema),
  adminUsersController.addNote,
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

adminRouter.get(
  '/users/:id/data-export',
  requirePermission(PERMISSIONS['users.delete']),
  validate(idParamSchema, 'params'),
  adminUsersController.dataExport,
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
adminRouter.use('/referrals', adminReferralRouter)
adminRouter.use(adminTradingRouter)
adminRouter.use('/media', adminMediaRouter)
adminRouter.use('/support', adminSupportRouter)
adminRouter.use(adminSettingsRouter)
adminRouter.use(adminHandoverRouter)
adminRouter.use('/reports', adminReportsRouter)
adminRouter.use('/broadcasts', adminBroadcastsRouter)
adminRouter.use('/announcements', adminAnnouncementsRouter)
adminRouter.use(adminEmailsRouter)
