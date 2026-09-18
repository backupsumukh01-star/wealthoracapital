import { adminUserHistoryService } from '../services/admin-user-history.service.js'
import { adminUsersService } from '../services/admin-users.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  adminCreateUserSchema,
  adminStatusReasonSchema,
  adminUpdateUserSchema,
  adminUserHistoryCreateSchema,
  adminUserListQuerySchema,
  adminUserNoteSchema,
} from '../validators/admin.validators.js'
import type { z } from 'zod'

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
}
