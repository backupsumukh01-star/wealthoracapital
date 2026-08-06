import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/** SendGrid transport stub — fails closed in production until a real HTTP client is wired. */
export class SendgridEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'EMAIL_TRANSPORT=sendgrid is stubbed. Use EMAIL_TRANSPORT=resend or implement SendGrid HTTP delivery.',
      )
    }
    logger.warn(
      { to: message.to, subject: message.subject, template: message.template },
      'SendGrid transport stub — message logged only (non-production)',
    )
  }
}
