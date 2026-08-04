import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { kycController, kycUpload } from '../controllers/kyc.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { idParamSchema } from '../validators/admin.validators.js'
import { kycUpsertSchema } from '../validators/kyc.validators.js'

export const kycRouter = Router()

kycRouter.get('/files/download', kycController.signedDownload)

kycRouter.use(authenticate)

kycRouter.get('/status', requirePermission(PERMISSIONS['kyc.view']), kycController.status)
kycRouter.get('/me', requirePermission(PERMISSIONS['kyc.view']), kycController.status)
kycRouter.patch(
  '/update',
  requirePermission(PERMISSIONS['kyc.submit']),
  validate(kycUpsertSchema),
  kycController.update,
)
kycRouter.post('/submit', requirePermission(PERMISSIONS['kyc.submit']), kycController.submit)
kycRouter.post('/', requirePermission(PERMISSIONS['kyc.submit']), kycController.submit)
kycRouter.post(
  '/upload',
  requirePermission(PERMISSIONS['kyc.submit']),
  kycUpload.single('file'),
  kycController.upload,
)
kycRouter.get('/history', requirePermission(PERMISSIONS['kyc.view']), kycController.history)
kycRouter.get('/documents', requirePermission(PERMISSIONS['kyc.view']), kycController.documents)
kycRouter.delete(
  '/document/:id',
  requirePermission(PERMISSIONS['kyc.submit']),
  validate(idParamSchema, 'params'),
  kycController.deleteDocument,
)
