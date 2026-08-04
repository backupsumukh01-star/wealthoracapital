import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/**
 * Resend transport stub. Logs intent until `RESEND_API_KEY` is wired to a real HTTP call —
 * mirrors the SMTP stub architecture so swapping in the real SDK later is a one-file change.
 */
export class ResendEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (!env.RESEND_API_KEY) {
      logger.warn(
        { to: message.to, subject: message.subject },
        'Resend transport selected but RESEND_API_KEY is not set; message logged only',
      )
      return
    }
    logger.info(
      { to: message.to, subject: message.subject, template: message.template },
      'Email dispatched via Resend (stub — integrate resend SDK for live delivery)',
    )
  }
}
