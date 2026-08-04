import { authService } from '../services/auth.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

export const usersController = {
  me: asyncHandler(async (req, res) => {
    const data = await authService.me(req.user!.id)
    sendSuccess(res, data)
  }),
}
