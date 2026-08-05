import multer from 'multer'
import path from 'node:path'

import { kycService } from '../services/kyc/kyc.service.js'
import { storage } from '../services/storage/index.js'
import { asyncHandler } from '../utils/async-handler.js'
import { badRequest } from '../utils/errors.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import {
  kycUploadMetaSchema,
  type kycAdminListQuerySchema,
  type kycCompatReviewSchema,
  type kycReviewBodySchema,
  type kycUpsertSchema,
} from '../validators/kyc.validators.js'
import type { z } from 'zod'

type UpsertBody = z.infer<typeof kycUpsertSchema>
type UploadMeta = z.infer<typeof kycUploadMetaSchema>
type ReviewBody = z.infer<typeof kycReviewBodySchema>
type CompatReview = z.infer<typeof kycCompatReviewSchema>
type AdminListQuery = z.infer<typeof kycAdminListQuerySchema>

export const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

export const kycController = {
  status: asyncHandler(async (req, res) => {
    sendSuccess(res, await kycService.getStatus(req.user!.id))
  }),

  update: asyncHandler(async (req, res) => {
    const data = await kycService.upsertDraft(
      req.user!.id,
      req.body as UpsertBody,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  submit: asyncHandler(async (req, res) => {
    const body = req.body as Partial<UpsertBody>
    if (body.country && body.dateOfBirth) {
      await kycService.upsertDraft(req.user!.id, body as UpsertBody, requestContext(req))
    }
    const data = await kycService.submit(req.user!.id, requestContext(req))
    sendSuccess(res, data)
  }),

  upload: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) throw badRequest('Document file is required.')
    const parsedMeta = kycUploadMetaSchema.safeParse({
      documentType: req.body.documentType,
      side: req.body.side ?? 'SINGLE',
    })
    if (!parsedMeta.success) {
      throw badRequest('Invalid upload metadata.', {
        issues: parsedMeta.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
    }
    const meta = parsedMeta.data as UploadMeta
    const data = await kycService.uploadDocument(
      req.user!.id,
      meta,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  history: asyncHandler(async (req, res) => {
    sendSuccess(res, await kycService.history(req.user!.id))
  }),

  documents: asyncHandler(async (req, res) => {
    sendSuccess(res, await kycService.listDocuments(req.user!.id))
  }),

  deleteDocument: asyncHandler(async (req, res) => {
    const data = await kycService.deleteDocument(
      req.user!.id,
      req.params.id!,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  signedDownload: asyncHandler(async (req, res) => {
    const key = String(req.query.key ?? '')
    const expires = String(req.query.expires ?? '')
    const signature = String(req.query.signature ?? '')
    const storageKey = await kycService.resolveSignedFile(key, expires, signature)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(storageKey)}"`)
    const stream = await storage.openReadStream(storageKey)
    stream.pipe(res)
  }),

  adminList: asyncHandler(async (req, res) => {
    const query = req.query as unknown as AdminListQuery
    const data = await kycService.adminList({
      q: query.q,
      status: query.status,
      country: query.country,
      riskLevel: query.riskLevel,
      reviewerId: query.reviewerId,
      documentType: query.documentType,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
      cursor: query.cursor,
      sortOrder: query.sortOrder,
    })
    sendSuccess(res, data)
  }),

  adminGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await kycService.adminGet(req.params.id!))
  }),

  metrics: asyncHandler(async (_req, res) => {
    sendSuccess(res, await kycService.metrics())
  }),

  approve: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        'APPROVE',
        req.body as ReviewBody,
        requestContext(req),
      ),
    )
  }),

  reject: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        'REJECT',
        req.body as ReviewBody,
        requestContext(req),
      ),
    )
  }),

  requestInformation: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        'REQUEST_INFORMATION',
        req.body as ReviewBody,
        requestContext(req),
      ),
    )
  }),

  expire: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        'EXPIRE',
        req.body as ReviewBody,
        requestContext(req),
      ),
    )
  }),

  reopen: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        'REOPEN',
        req.body as ReviewBody,
        requestContext(req),
      ),
    )
  }),

  suspend: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        'SUSPEND',
        req.body as ReviewBody,
        requestContext(req),
      ),
    )
  }),

  compatReview: asyncHandler(async (req, res) => {
    const body = req.body as CompatReview
    sendSuccess(
      res,
      await kycService.adminDecision(
        req.user!.id,
        req.params.id!,
        body.decision === 'APPROVE' ? 'APPROVE' : 'REJECT',
        { reason: body.reason },
        requestContext(req),
      ),
    )
  }),
}
