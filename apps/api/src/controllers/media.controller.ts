import multer from 'multer'
import type { z } from 'zod'

import { mediaService } from '../services/media.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { badRequest } from '../utils/errors.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  mediaListQuerySchema,
  mediaMetadataSchema,
  mediaMoveSchema,
  mediaRenameSchema,
} from '../validators/media.validators.js'

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

export const mediaController = {
  upload: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) throw badRequest('A media file is required.')
    const folder = typeof req.body?.folder === 'string' ? req.body.folder : 'Uploads'
    const asset = await mediaService.upload(
      req.user!.id,
      { originalname: file.originalname, mimetype: file.mimetype, buffer: file.buffer, size: file.size },
      folder,
      requestContext(req),
    )
    sendSuccess(res, asset, 201)
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await mediaService.list(req.query as unknown as z.infer<typeof mediaListQuerySchema>))
  }),

  folders: asyncHandler(async (_req, res) => {
    sendSuccess(res, { items: await mediaService.listFolders() })
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, await mediaService.get(req.params.id!))
  }),

  rename: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof mediaRenameSchema>
    sendSuccess(res, await mediaService.rename(req.params.id!, body.name))
  }),

  move: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof mediaMoveSchema>
    sendSuccess(res, await mediaService.move(req.params.id!, body.folder))
  }),

  updateMetadata: asyncHandler(async (req, res) => {
    sendSuccess(res, await mediaService.updateMetadata(req.params.id!, req.body as z.infer<typeof mediaMetadataSchema>))
  }),

  softDelete: asyncHandler(async (req, res) => {
    sendSuccess(res, await mediaService.softDelete(req.params.id!, req.user!.id, requestContext(req)))
  }),

  restore: asyncHandler(async (req, res) => {
    sendSuccess(res, await mediaService.restore(req.params.id!))
  }),

  permanentlyDelete: asyncHandler(async (req, res) => {
    await mediaService.permanentlyDelete(req.params.id!)
    sendSuccess(res, null)
  }),
}
