import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { reportController } from '../controllers/report.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { adminGenerateReportSchema, reportListQuerySchema } from '../validators/report.validators.js'

export const adminReportsRouter = Router()

adminReportsRouter.get(
  '/',
  requirePermission(PERMISSIONS['reports.view']),
  validate(reportListQuerySchema, 'query'),
  reportController.adminList,
)
adminReportsRouter.post(
  '/',
  requirePermission(PERMISSIONS['reports.manage']),
  validate(adminGenerateReportSchema),
  reportController.adminGenerate,
)
adminReportsRouter.get('/:id', requirePermission(PERMISSIONS['reports.view']), reportController.adminGet)
