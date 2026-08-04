import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { cmsController } from '../controllers/cms.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { cmsContentSchema, cmsPublishBodySchema, cmsScheduleBodySchema } from '../validators/cms.validators.js'

export const cmsRouter = Router()

// ---- Public (no auth) ------------------------------------------------------
cmsRouter.get('/public', cmsController.publicBootstrap)
cmsRouter.get('/public/announcements', cmsController.activeAnnouncements)
cmsRouter.get('/public/pages/:slug', cmsController.getPage)

// ---- Staff-only (authenticate + cms.view / cms.manage) ---------------------
const staff = Router()
staff.use(authenticate)

staff.post(
  '/public/revisions/:revisionId/rollback',
  requirePermission(PERMISSIONS['cms.manage']),
  cmsController.rollback,
)

staff.get('/landing', requirePermission(PERMISSIONS['cms.view']), cmsController.getLanding)
staff.put(
  '/landing',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsContentSchema),
  cmsController.updateLanding,
)
staff.post(
  '/landing/autosave',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsContentSchema),
  cmsController.autosaveLanding,
)
staff.post(
  '/landing/publish',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsPublishBodySchema),
  cmsController.publishLanding,
)
staff.post(
  '/landing/schedule',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsScheduleBodySchema),
  cmsController.scheduleLanding,
)
staff.get('/landing/revisions', requirePermission(PERMISSIONS['cms.view']), cmsController.revisionHistory)

staff.get('/platform', requirePermission(PERMISSIONS['cms.view']), cmsController.getPlatform)
staff.put(
  '/platform',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsContentSchema),
  cmsController.updatePlatformDraft,
)
staff.post(
  '/platform/publish',
  requirePermission(PERMISSIONS['cms.manage']),
  validate(cmsContentSchema),
  cmsController.publishPlatform,
)
staff.get('/platform/revisions', requirePermission(PERMISSIONS['cms.view']), cmsController.revisionHistory)

staff.get('/publish-logs', requirePermission(PERMISSIONS['cms.view']), cmsController.publishLogs)

staff.get('/faqs', requirePermission(PERMISSIONS['cms.view']), cmsController.listFaqs)
staff.post('/faqs', requirePermission(PERMISSIONS['cms.manage']), cmsController.createFaq)
staff.patch('/faqs/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.updateFaq)
staff.delete('/faqs/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.deleteFaq)
staff.post('/faqs/:id/restore', requirePermission(PERMISSIONS['cms.manage']), cmsController.restoreFaq)

staff.get('/testimonials', requirePermission(PERMISSIONS['cms.view']), cmsController.listTestimonials)
staff.post('/testimonials', requirePermission(PERMISSIONS['cms.manage']), cmsController.createTestimonial)
staff.patch('/testimonials/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.updateTestimonial)
staff.delete('/testimonials/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.deleteTestimonial)
staff.post('/testimonials/:id/restore', requirePermission(PERMISSIONS['cms.manage']), cmsController.restoreTestimonial)

staff.get('/announcements', requirePermission(PERMISSIONS['cms.view']), cmsController.listAnnouncements)
staff.post('/announcements', requirePermission(PERMISSIONS['cms.manage']), cmsController.createAnnouncement)
staff.patch('/announcements/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.updateAnnouncement)
staff.delete('/announcements/:id', requirePermission(PERMISSIONS['cms.manage']), cmsController.deleteAnnouncement)
staff.post('/announcements/:id/restore', requirePermission(PERMISSIONS['cms.manage']), cmsController.restoreAnnouncement)

staff.get('/pages', requirePermission(PERMISSIONS['cms.view']), cmsController.listPages)
staff.get('/pages/:slug', requirePermission(PERMISSIONS['cms.view']), cmsController.getPage)
staff.put('/pages/:slug', requirePermission(PERMISSIONS['cms.manage']), cmsController.upsertPage)

cmsRouter.use(staff)
