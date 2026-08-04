import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/** SendGrid transport stub — logs intent until `SENDGRID_API_KEY` is wired to a real HTTP call. */
export class SendgridEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (!env.SENDGRID_API_KEY) {
      logger.warn(
        { to: message.to, subject: message.subject },
        'SendGrid transport selected but SENDGRID_API_KEY is not set; message logged only',
      )
      return
    }
    logger.info(
      { to: message.to, subject: message.subject, template: message.template },
      'Email dispatched via SendGrid (stub — integrate @sendgrid/mail for live delivery)',
    )
  }
}
