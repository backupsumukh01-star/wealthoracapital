import multer from 'multer'

import { profileService } from '../services/profile.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { badRequest } from '../utils/errors.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type { updateProfileSchema } from '../validators/profile.validators.js'
import type { z } from 'zod'

type UpdateBody = z.infer<typeof updateProfileSchema>

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
})

export const profileController = {
  get: asyncHandler(async (req, res) => {
    const data = await profileService.getProfile(req.user!.id)
    sendSuccess(res, data)
  }),

  update: asyncHandler(async (req, res) => {
    const data = await profileService.updateProfile(
      req.user!.id,
      req.body as UpdateBody,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) {
      throw badRequest('Avatar file is required.')
    }
    const data = await profileService.uploadAvatar(
      req.user!.id,
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

  listSessions: asyncHandler(async (req, res) => {
    const data = await profileService.listSessions(req.user!.id, req.user!.sessionId)
    sendSuccess(res, data)
  }),

  currentSession: asyncHandler(async (req, res) => {
    const data = await profileService.currentSession(req.user!.id, req.user!.sessionId)
    sendSuccess(res, data)
  }),

  terminateSession: asyncHandler(async (req, res) => {
    await profileService.terminateSession(
      req.user!.id,
      req.params.id!,
      req.user!.sessionId,
      requestContext(req),
    )
    sendSuccess(res, null)
  }),

  terminateOtherSessions: asyncHandler(async (req, res) => {
    const data = await profileService.terminateOtherSessions(
      req.user!.id,
      req.user!.sessionId,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),
}
