import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { cmsController } from '../controllers/cms.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'

/** Thin alias of the CMS announcement endpoints under `/admin/announcements`, matching the shared route map. */
export const adminAnnouncementsRouter = Router()

adminAnnouncementsRouter.get('/', requirePermission(PERMISSIONS['cms.view']), cmsController.listAnnouncements)
adminAnnouncementsRouter.post('/', requirePermission(PERMISSIONS['cms.manage']), cmsController.createAnnouncement)
adminAnnouncementsRouter.patch('/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.updateAnnouncement)
adminAnnouncementsRouter.delete('/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.deleteAnnouncement)
adminAnnouncementsRouter.post(
  '/:id/restore',
  requirePermission(PERMISSIONS['cms.manage']),
  cmsController.restoreAnnouncement,
)
