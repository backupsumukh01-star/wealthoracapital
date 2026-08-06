import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import {
  cmsDownloadController,
  downloadUpload,
} from '../controllers/cms-download.controller.js'
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  cmsDownloadMetaSchema,
  cmsDownloadReorderSchema,
} from '../validators/cms-download.validators.js'

export const cmsDownloadRouter = Router()

// Public list (+ authenticated extras when session present)
cmsDownloadRouter.get('/public', optionalAuthenticate, cmsDownloadController.listPublic)
cmsDownloadRouter.post('/public/:id/hit', cmsDownloadController.hit)

const staff = Router()
staff.use(authenticate)
staff.get('/', requirePermission(PERMISSIONS['cms.view']), cmsDownloadController.listAdmin)
staff.post(
  '/reorder',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsDownloadReorderSchema),
  cmsDownloadController.reorder,
)
staff.post(
  '/',
  requirePermission(PERMISSIONS['cms.manage']),
  downloadUpload.single('file'),
  cmsDownloadController.create,
)
staff.get('/:id', requirePermission(PERMISSIONS['cms.view']), cmsDownloadController.get)
staff.patch(
  '/:id',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsDownloadMetaSchema),
  cmsDownloadController.update,
)
staff.post(
  '/:id/replace',
  requirePermission(PERMISSIONS['cms.manage']),
  downloadUpload.single('file'),
  cmsDownloadController.replace,
)
staff.post('/:id/publish', requirePermission(PERMISSIONS['cms.manage']), cmsDownloadController.publish)
staff.post('/:id/archive', requirePermission(PERMISSIONS['cms.manage']), cmsDownloadController.archive)
staff.delete('/:id', requirePermission(PERMISSIONS['cms.manage']), cmsDownloadController.remove)

cmsDownloadRouter.use(staff)
