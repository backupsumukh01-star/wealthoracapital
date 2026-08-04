import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { adminEmailsController } from '../controllers/admin-emails.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { idParamSchema } from '../validators/admin.validators.js'
import {
  emailOutboxListQuerySchema,
  emailTemplateCreateSchema,
  emailTemplateListQuerySchema,
  emailTemplatePreviewSchema,
  emailTemplateUpdateSchema,
  emailTestSendSchema,
} from '../validators/email.validators.js'

export const adminEmailsRouter = Router()

adminEmailsRouter.get(
  '/email-templates',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(emailTemplateListQuerySchema, 'query'),
  adminEmailsController.listTemplates,
)
adminEmailsRouter.post(
  '/email-templates',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(emailTemplateCreateSchema),
  adminEmailsController.createTemplate,
)
adminEmailsRouter.get(
  '/email-templates/:id',
  requirePermission(PERMISSIONS['emails.manage']),
  adminEmailsController.getTemplate,
)
adminEmailsRouter.patch(
  '/email-templates/:id',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(emailTemplateUpdateSchema),
  adminEmailsController.updateTemplate,
)
adminEmailsRouter.get(
  '/email-templates/:id/versions',
  requirePermission(PERMISSIONS['emails.manage']),
  adminEmailsController.listVersions,
)
adminEmailsRouter.post(
  '/email-templates/:id/preview',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(emailTemplatePreviewSchema),
  adminEmailsController.previewTemplate,
)

adminEmailsRouter.get(
  '/emails',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(emailOutboxListQuerySchema, 'query'),
  adminEmailsController.listOutbox,
)
adminEmailsRouter.post(
  '/emails/test',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(emailTestSendSchema),
  adminEmailsController.sendTest,
)
adminEmailsRouter.post(
  '/emails/process-queue',
  requirePermission(PERMISSIONS['emails.manage']),
  adminEmailsController.processQueue,
)
adminEmailsRouter.get(
  '/emails/:id',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(idParamSchema, 'params'),
  adminEmailsController.getOutboxItem,
)
adminEmailsRouter.post(
  '/emails/:id/retry',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(idParamSchema, 'params'),
  adminEmailsController.retryOutboxItem,
)
adminEmailsRouter.post(
  '/emails/:id/cancel',
  requirePermission(PERMISSIONS['emails.manage']),
  validate(idParamSchema, 'params'),
  adminEmailsController.cancelOutboxItem,
)
