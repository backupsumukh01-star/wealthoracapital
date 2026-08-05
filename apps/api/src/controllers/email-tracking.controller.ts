import { env } from '../config/env.js'
import { emailOutboxService } from '../services/email/email-outbox.service.js'
import { asyncHandler } from '../utils/async-handler.js'

const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64',
)

/** Allow only relative paths or absolute URLs on the configured APP_URL origin. */
function safeRedirectTarget(raw: string): string {
  const fallback = '/'
  const trimmed = raw.trim()
  if (!trimmed) return fallback

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  try {
    const appOrigin = new URL(env.APP_URL).origin
    const target = new URL(trimmed, env.APP_URL)
    if (target.origin === appOrigin) {
      return target.toString()
    }
  } catch {
    return fallback
  }

  return fallback
}

export const emailTrackingController = {
  open: asyncHandler(async (req, res) => {
    await emailOutboxService.trackOpen(req.params.token!)
    res.setHeader('Content-Type', 'image/gif')
    res.status(200).send(TRANSPARENT_PIXEL)
  }),

  click: asyncHandler(async (req, res) => {
    await emailOutboxService.trackClick(req.params.token!)
    const raw = typeof req.query.url === 'string' ? req.query.url : '/'
    res.redirect(302, safeRedirectTarget(raw))
  }),
}
