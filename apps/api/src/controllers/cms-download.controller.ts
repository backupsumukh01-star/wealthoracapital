import multer from 'multer'
import type { z } from 'zod'

import { cmsDownloadService } from '../services/cms/cms-download.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { badRequest } from '../utils/errors.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  cmsDownloadMetaSchema,
  cmsDownloadReorderSchema,
} from '../validators/cms-download.validators.js'

export const downloadUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
})

export const cmsDownloadController = {
  listAdmin: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await cmsDownloadService.listAdmin({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 12,
      }),
    )
  }),

  listPublic: asyncHandler(async (req, res) => {
    const authed = Boolean(req.user)
    sendSuccess(res, {
      items: await cmsDownloadService.listPublic({ includeAuthenticated: authed }),
    })
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsDownloadService.get(req.params.id!))
  }),

  create: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) throw badRequest('A file is required.')
    const body = req.body as Record<string, string>
    sendSuccess(
      res,
      await cmsDownloadService.create(
        { id: req.user!.id, name: req.user!.email },
        {
          title: body.title || file.originalname,
          description: body.description,
          category: body.category,
          thumbnailUrl: body.thumbnailUrl,
          buttonLabel: body.buttonLabel,
          version: body.version,
          publishDate: body.publishDate || null,
          visibility: (body.visibility as 'PUBLIC' | 'AUTHENTICATED') || 'PUBLIC',
          sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
          status: (body.status as 'DRAFT' | 'PUBLISHED') || 'DRAFT',
        },
        {
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        },
        requestContext(req),
      ),
      201,
    )
  }),

  update: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof cmsDownloadMetaSchema>
    sendSuccess(
      res,
      await cmsDownloadService.updateMeta(req.params.id!, req.user!.id, body, requestContext(req)),
    )
  }),

  replace: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) throw badRequest('A replacement file is required.')
    const version = typeof req.body?.version === 'string' ? req.body.version : undefined
    sendSuccess(
      res,
      await cmsDownloadService.replaceFile(
        req.params.id!,
        { id: req.user!.id, name: req.user!.email },
        {
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        },
        requestContext(req),
        version,
      ),
    )
  }),

  publish: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsDownloadService.publish(req.params.id!, req.user!.id, requestContext(req)))
  }),

  archive: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsDownloadService.archive(req.params.id!, req.user!.id, requestContext(req)))
  }),

  remove: asyncHandler(async (req, res) => {
    sendSuccess(res, await cmsDownloadService.softDelete(req.params.id!, req.user!.id, requestContext(req)))
  }),

  reorder: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof cmsDownloadReorderSchema>
    sendSuccess(res, await cmsDownloadService.reorder(body.ids, req.user!.id, requestContext(req)))
  }),

  hit: asyncHandler(async (req, res) => {
    await cmsDownloadService.recordHit(req.params.id!)
    sendSuccess(res, { ok: true })
  }),
}
