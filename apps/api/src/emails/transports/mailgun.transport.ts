import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/** Mailgun transport stub — fails closed in production. */
export class MailgunEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'EMAIL_TRANSPORT=mailgun is stubbed. Use EMAIL_TRANSPORT=resend or implement Mailgun delivery.',
      )
    }
    logger.warn(
      { to: message.to, subject: message.subject },
      'Mailgun transport stub — message logged only (non-production)',
    )
  }
}
