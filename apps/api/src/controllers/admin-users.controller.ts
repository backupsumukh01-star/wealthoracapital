import { adminUsersService } from '../services/admin-users.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  adminStatusReasonSchema,
  adminUpdateUserSchema,
  adminUserListQuerySchema,
} from '../validators/admin.validators.js'
import type { z } from 'zod'

type ListQuery = z.infer<typeof adminUserListQuerySchema>
type UpdateBody = z.infer<typeof adminUpdateUserSchema>
type ReasonBody = z.infer<typeof adminStatusReasonSchema>

export const adminUsersController = {
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
    const body = req.body as ReasonBody
    const data = await adminUsersService.softDelete(
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
}
