import type { z } from 'zod'

import { emailOutboxService } from '../services/email/email-outbox.service.js'
import { emailTemplateService } from '../services/email/email-template.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  emailOutboxListQuerySchema,
  emailTemplateCreateSchema,
  emailTemplateListQuerySchema,
  emailTemplatePreviewSchema,
  emailTemplateUpdateSchema,
  emailTestSendSchema,
} from '../validators/email.validators.js'

type ListQuery = z.infer<typeof emailTemplateListQuerySchema>
type CreateBody = z.infer<typeof emailTemplateCreateSchema>
type UpdateBody = z.infer<typeof emailTemplateUpdateSchema>
type PreviewBody = z.infer<typeof emailTemplatePreviewSchema>
type OutboxQuery = z.infer<typeof emailOutboxListQuerySchema>
type TestSendBody = z.infer<typeof emailTestSendSchema>

export const adminEmailsController = {
  listTemplates: asyncHandler(async (req, res) => {
    const q = req.query as unknown as ListQuery
    sendSuccess(res, await emailTemplateService.list(q))
  }),

  getTemplate: asyncHandler(async (req, res) => {
    sendSuccess(res, await emailTemplateService.getByIdOrKey(req.params.id!))
  }),

  createTemplate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await emailTemplateService.create(req.user!.id, req.body as CreateBody, requestContext(req)),
      201,
    )
  }),

  updateTemplate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await emailTemplateService.update(
        req.user!.id,
        req.params.id!,
        req.body as UpdateBody,
        requestContext(req),
      ),
    )
  }),

  listVersions: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await emailTemplateService.listVersions(req.params.id!) })
  }),

  previewTemplate: asyncHandler(async (req, res) => {
    const body = req.body as PreviewBody
    sendSuccess(res, await emailTemplateService.previewById(req.params.id!, body.variables))
  }),

  listOutbox: asyncHandler(async (req, res) => {
    const q = req.query as unknown as OutboxQuery
    sendSuccess(res, await emailOutboxService.list(q))
  }),

  getOutboxItem: asyncHandler(async (req, res) => {
    sendSuccess(res, await emailOutboxService.get(req.params.id!))
  }),

  retryOutboxItem: asyncHandler(async (req, res) => {
    sendSuccess(res, await emailOutboxService.retry(req.params.id!))
  }),

  cancelOutboxItem: asyncHandler(async (req, res) => {
    sendSuccess(res, await emailOutboxService.cancel(req.params.id!))
  }),

  sendTest: asyncHandler(async (req, res) => {
    const body = req.body as TestSendBody
    const row = await emailOutboxService.enqueue({
      to: body.to,
      templateKey: body.templateKey,
      subject: body.subject,
      html: body.html,
      variables: body.variables,
    })
    sendSuccess(res, row, 201)
  }),

  processQueue: asyncHandler(async (_req, res) => {
    sendSuccess(res, await emailOutboxService.processQueue())
  }),
}
