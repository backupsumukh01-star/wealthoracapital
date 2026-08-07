import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { supportController } from '../controllers/support.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { idParamSchema } from '../validators/admin.validators.js'
import {
  adminListQuerySchema,
  assignTicketSchema,
  categoryUpdateSchema,
  internalNoteSchema,
  mergeTicketSchema,
  priorityUpdateSchema,
  replyTicketSchema,
  transferTicketSchema,
} from '../validators/support.validators.js'

export const adminSupportRouter = Router()

adminSupportRouter.get(
  '/',
  requirePermission(PERMISSIONS['support.view']),
  validate(adminListQuerySchema, 'query'),
  supportController.adminList,
)
adminSupportRouter.get('/metrics', requirePermission(PERMISSIONS['support.view']), supportController.metrics)
adminSupportRouter.get(
  '/:id',
  requirePermission(PERMISSIONS['support.view']),
  validate(idParamSchema, 'params'),
  supportController.adminGet,
)
adminSupportRouter.post(
  '/:id/messages',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(replyTicketSchema),
  supportController.adminReply,
)
adminSupportRouter.post(
  '/:id/assign',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(assignTicketSchema),
  supportController.assign,
)
adminSupportRouter.post(
  '/:id/priority',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(priorityUpdateSchema),
  supportController.updatePriority,
)
adminSupportRouter.post(
  '/:id/category',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(categoryUpdateSchema),
  supportController.updateCategory,
)
adminSupportRouter.post(
  '/:id/notes',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(internalNoteSchema),
  supportController.addInternalNote,
)
adminSupportRouter.post(
  '/:id/close',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  supportController.close,
)
adminSupportRouter.post(
  '/:id/reopen',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  supportController.reopen,
)
adminSupportRouter.post(
  '/:id/merge',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(mergeTicketSchema),
  supportController.merge,
)
adminSupportRouter.post(
  '/:id/transfer',
  requirePermission(PERMISSIONS['support.manage']),
  validate(idParamSchema, 'params'),
  validate(transferTicketSchema),
  supportController.transfer,
)
