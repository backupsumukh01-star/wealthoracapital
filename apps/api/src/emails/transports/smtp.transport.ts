import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/**
 * SMTP transport stub architecture.
 * Phase 1 logs intent only — a real nodemailer/ESP integration lands in a later phase.
 */
export class SmtpEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    logger.warn(
      {
        email: {
          to: message.to,
          subject: message.subject,
          template: message.template,
        },
      },
      'SMTP transport selected but provider integration is deferred; message logged only',
    )
  }
}
