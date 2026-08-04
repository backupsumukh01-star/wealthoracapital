import { emailOutboxService } from '../services/email/email-outbox.service.js'
import { asyncHandler } from '../utils/async-handler.js'

const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64',
)

export const emailTrackingController = {
  open: asyncHandler(async (req, res) => {
    await emailOutboxService.trackOpen(req.params.token!)
    res.setHeader('Content-Type', 'image/gif')
    res.status(200).send(TRANSPARENT_PIXEL)
  }),

  click: asyncHandler(async (req, res) => {
    await emailOutboxService.trackClick(req.params.token!)
    const target = typeof req.query.url === 'string' ? req.query.url : '/'
    res.redirect(302, target)
  }),
}
