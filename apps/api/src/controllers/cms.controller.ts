import type { z } from 'zod'

import { cmsService } from '../services/cms/cms.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { badRequest } from '../utils/errors.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  cmsAnnouncementCreateSchema,
  cmsAnnouncementUpdateSchema,
  cmsContentSchema,
  cmsFaqCreateSchema,
  cmsFaqUpdateSchema,
  cmsPageUpsertSchema,
  cmsPublishBodySchema,
  cmsScheduleBodySchema,
  cmsTestimonialCreateSchema,
  cmsTestimonialUpdateSchema,
} from '../validators/cms.validators.js'

type ContentBody = z.infer<typeof cmsContentSchema>
type PublishBody = z.infer<typeof cmsPublishBodySchema>
type ScheduleBody = z.infer<typeof cmsScheduleBodySchema>
type FaqCreate = z.infer<typeof cmsFaqCreateSchema>
type FaqUpdate = z.infer<typeof cmsFaqUpdateSchema>
type TestimonialCreate = z.infer<typeof cmsTestimonialCreateSchema>
type TestimonialUpdate = z.infer<typeof cmsTestimonialUpdateSchema>
type AnnouncementCreate = z.infer<typeof cmsAnnouncementCreateSchema>
type AnnouncementUpdate = z.infer<typeof cmsAnnouncementUpdateSchema>
type PageUpsert = z.infer<typeof cmsPageUpsertSchema>

export const cmsController = {
  publicBootstrap: asyncHandler(async (_req, res) => {
    sendSuccess(res, await cmsService.publicBootstrap())
  }),

  activeAnnouncements: asyncHandler(async (_req, res) => {
    sendSuccess(res, { items: await cmsService.listActiveAnnouncements() })
  }),

  getLanding: asyncHandler(async (_req, res) => {
    sendSuccess(res, await cmsService.getDocument('LANDING'))
  }),
  updateLanding: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await cmsService.updateDraft(
        'LANDING',
        req.user!.id,
        req.body as ContentBody,
        requestContext(req),
      ),
    )
  }),
  autosaveLanding: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.autosaveDraft('LANDING', req.user!.id, req.body as ContentBody))
  }),
  publishLanding: asyncHandler(async (req, res) => {
    const body = req.body as PublishBody
    sendSuccess(
      res,
      await cmsService.publish('LANDING', req.user!.id, body.content, requestContext(req)),
    )
  }),
  scheduleLanding: asyncHandler(async (req, res) => {
    const body = req.body as ScheduleBody
    sendSuccess(
      res,
      await cmsService.schedule(
        'LANDING',
        req.user!.id,
        body.content,
        new Date(body.scheduledAt),
        requestContext(req),
      ),
    )
  }),

  getPlatform: asyncHandler(async (_req, res) => {
    const doc = await cmsService.getDocument('PLATFORM')
    sendSuccess(res, doc.content)
  }),
  updatePlatformDraft: asyncHandler(async (req, res) => {
    const doc = await cmsService.updateDraft(
      'PLATFORM',
      req.user!.id,
      req.body as ContentBody,
      requestContext(req),
    )
    sendSuccess(res, doc.content)
  }),
  publishPlatform: asyncHandler(async (req, res) => {
    const doc = await cmsService.publish(
      'PLATFORM',
      req.user!.id,
      req.body as ContentBody,
      requestContext(req),
    )
    sendSuccess(res, doc.content)
  }),

  rollback: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await cmsService.rollback(req.params.revisionId!, req.user!.id, requestContext(req)),
    )
  }),

  revisionHistory: asyncHandler(async (req, res) => {
    const key = req.params.key === 'platform' ? 'PLATFORM' : 'LANDING'
    sendSuccess(res, { items: await cmsService.listRevisions(key) })
  }),

  publishLogs: asyncHandler(async (_req, res) => {
    sendSuccess(res, { items: await cmsService.listPublishLogs() })
  }),

  // FAQs
  listFaqs: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await cmsService.listFaqs(req.query.includeDeleted === 'true') })
  }),
  createFaq: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.createFaq(req.body as FaqCreate), 201)
  }),
  updateFaq: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.updateFaq(req.params.id!, req.body as FaqUpdate))
  }),
  deleteFaq: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.softDeleteFaq(req.params.id!))
  }),
  restoreFaq: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.restoreFaq(req.params.id!))
  }),

  // Testimonials
  listTestimonials: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await cmsService.listTestimonials(req.query.includeDeleted === 'true') })
  }),
  createTestimonial: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.createTestimonial(req.body as TestimonialCreate), 201)
  }),
  updateTestimonial: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.updateTestimonial(req.params.id!, req.body as TestimonialUpdate))
  }),
  deleteTestimonial: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.softDeleteTestimonial(req.params.id!))
  }),
  restoreTestimonial: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.restoreTestimonial(req.params.id!))
  }),

  // Announcements
  listAnnouncements: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await cmsService.listAnnouncements(req.query.includeDeleted === 'true') })
  }),
  createAnnouncement: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.createAnnouncement(req.user!.id, req.body as AnnouncementCreate), 201)
  }),
  updateAnnouncement: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.updateAnnouncement(req.params.id!, req.body as AnnouncementUpdate))
  }),
  deleteAnnouncement: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.softDeleteAnnouncement(req.params.id!))
  }),
  restoreAnnouncement: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.restoreAnnouncement(req.params.id!))
  }),

  // Pages
  listPages: asyncHandler(async (_req, res) => {
    sendSuccess(res, { items: await cmsService.listPages() })
  }),
  getPage: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsService.getPage(req.params.slug!))
  }),
  upsertPage: asyncHandler(async (req, res) => {
    if (!req.params.slug) throw badRequest('Page slug is required.')
    sendSuccess(res, await cmsService.upsertPage(req.params.slug, req.body as PageUpsert))
  }),
}
