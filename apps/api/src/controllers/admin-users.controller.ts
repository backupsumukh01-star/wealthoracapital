import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import type { z } from 'zod'

import { adminUserHistoryService } from '../services/admin-user-history.service.js'
import { historicalImportService } from '../services/historical-import.service.js'
import { adminUsersService } from '../services/admin-users.service.js'
import {
  HISTORICAL_IMPORT_MAX_BYTES,
  HISTORICAL_IMPORT_MAX_MB,
} from '../services/historical-import-parse.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import { badRequest } from '../utils/errors.js'
import type {
  adminCreateUserSchema,
  adminStatusReasonSchema,
  adminUpdateUserSchema,
  adminUserHistoryCreateSchema,
  adminUserListQuerySchema,
  adminUserNoteSchema,
} from '../validators/admin.validators.js'

type ListQuery = z.infer<typeof adminUserListQuerySchema>
type CreateBody = z.infer<typeof adminCreateUserSchema>
type UpdateBody = z.infer<typeof adminUpdateUserSchema>
type ReasonBody = z.infer<typeof adminStatusReasonSchema>
type NoteBody = z.infer<typeof adminUserNoteSchema>
type HistoryBody = z.infer<typeof adminUserHistoryCreateSchema>

export const adminUsersController = {
  create: asyncHandler(async (req, res) => {
    const data = await adminUsersService.create(
      req.user!.id,
      req.body as CreateBody,
      requestContext(req),
    )
    sendSuccess(res, data, 201)
  }),

  list: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListQuery
    const result = await adminUsersService.list({
      filters: {
        q: query.q,
        status: query.status,
        role: query.role,
        country: query.country,
        phone: query.phone,
        referralCode: query.referralCode,
        emailVerified: query.emailVerified,
        kycStatus: query.kycStatus,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        includeDeleted: query.includeDeleted,
        lookalike: query.lookalike,
      },
      page: query.page,
      limit: query.limit,
      cursor: query.cursor,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })
    sendSuccess(res, result)
  }),

  get: asyncHandler(async (req, res) => {
    const data = await adminUsersService.getById(req.params.id!)
    sendSuccess(res, data)
  }),

  addNote: asyncHandler(async (req, res) => {
    const body = req.body as NoteBody
    const data = await adminUsersService.addNote(
      req.user!.id,
      req.params.id!,
      body.note,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  update: asyncHandler(async (req, res) => {
    const data = await adminUsersService.update(
      req.user!.id,
      req.params.id!,
      req.body as UpdateBody,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  disable: asyncHandler(async (req, res) => {
    const body = req.body as ReasonBody
    const data = await adminUsersService.setStatus(
      req.user!.id,
      req.params.id!,
      'CLOSED',
      'user.disable',
      body.reason ?? null,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  enable: asyncHandler(async (req, res) => {
    const body = req.body as ReasonBody
    const data = await adminUsersService.setStatus(
      req.user!.id,
      req.params.id!,
      'ACTIVE',
      'user.enable',
      body.reason ?? null,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  suspend: asyncHandler(async (req, res) => {
    const body = req.body as ReasonBody
    const data = await adminUsersService.setStatus(
      req.user!.id,
      req.params.id!,
      'SUSPENDED',
      'user.suspend',
      body.reason ?? null,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  block: asyncHandler(async (req, res) => {
    const body = req.body as ReasonBody
    const data = await adminUsersService.setStatus(
      req.user!.id,
      req.params.id!,
      'BLOCKED',
      'user.block',
      body.reason ?? null,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  remove: asyncHandler(async (req, res) => {
    const body = req.body as ReasonBody & { mode?: 'soft' | 'hard' }
    const mode = body.mode === 'hard' ? 'hard' : 'soft'
    const data =
      mode === 'hard'
        ? await adminUsersService.hardDelete(
            req.user!.id,
            req.params.id!,
            body.reason ?? null,
            requestContext(req),
          )
        : await adminUsersService.softDelete(
            req.user!.id,
            req.params.id!,
            body.reason ?? null,
            requestContext(req),
          )
    sendSuccess(res, data)
  }),

  restore: asyncHandler(async (req, res) => {
    const data = await adminUsersService.restore(
      req.user!.id,
      req.params.id!,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  forceLogout: asyncHandler(async (req, res) => {
    const data = await adminUsersService.forceLogout(
      req.user!.id,
      req.params.id!,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  history: asyncHandler(async (req, res) => {
    const data = await adminUserHistoryService.get(req.params.id!)
    sendSuccess(res, data)
  }),

  wipeHistory: asyncHandler(async (req, res) => {
    const data = await adminUserHistoryService.wipe(
      req.user!.id,
      req.params.id!,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  createHistory: asyncHandler(async (req, res) => {
    const body = req.body as HistoryBody
    const data = await adminUserHistoryService.create(
      req.user!.id,
      req.params.id!,
      body,
      requestContext(req),
    )
    sendSuccess(res, data, 201)
  }),

  historyImportTemplateCsv: asyncHandler(async (req, res) => {
    await historicalImportService.list(req.params.id!)
    const file = historicalImportService.templateCsv()
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
    res.send(file.body)
  }),

  historyImportTemplateXlsx: asyncHandler(async (req, res) => {
    await historicalImportService.list(req.params.id!)
    const file = historicalImportService.templateXlsx()
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
    res.send(file.body)
  }),

  historyImportPreview: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) throw badRequest('Spreadsheet file is required.')
    const data = await historicalImportService.preview(
      req.user!.id,
      req.params.id!,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      requestContext(req),
    )
    sendSuccess(res, data, 201)
  }),

  historyImports: asyncHandler(async (req, res) => {
    sendSuccess(res, await historicalImportService.list(req.params.id!))
  }),

  historyImportGet: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await historicalImportService.get(req.user!.id, req.params.id!, req.params.importId!),
    )
  }),

  historyImportConfirm: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await historicalImportService.confirm(
        req.user!.id,
        req.params.id!,
        req.params.importId!,
        requestContext(req),
      ),
    )
  }),

  historyImportCancel: asyncHandler(async (req, res) => {
    sendSuccess(res, await historicalImportService.cancel(req.params.id!, req.params.importId!))
  }),
}

export const historyImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: HISTORICAL_IMPORT_MAX_BYTES },
})

export function handleHistoryImportUpload(req: Request, res: Response, next: NextFunction) {
  historyImportUpload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(badRequest(`File exceeds ${HISTORICAL_IMPORT_MAX_MB}MB.`))
      return
    }
    next(badRequest(err instanceof Error ? err.message : 'Upload failed.'))
  })
}
