import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/** Mailgun transport stub — logs intent until `MAILGUN_API_KEY`/`MAILGUN_DOMAIN` are wired. */
export class MailgunEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
      logger.warn(
        { to: message.to, subject: message.subject },
        'Mailgun transport selected but credentials are not set; message logged only',
      )
      return
    }
    logger.info(
      { to: message.to, subject: message.subject, template: message.template, domain: env.MAILGUN_DOMAIN },
      'Email dispatched via Mailgun (stub — integrate mailgun.js for live delivery)',
    )
  }
}
