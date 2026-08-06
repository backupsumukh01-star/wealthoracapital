import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/**
 * SMTP transport — not implemented. Production must use Resend (or a wired ESP).
 * Never silently drop OTP / finance mail in production.
 */
export class SmtpEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'EMAIL_TRANSPORT=smtp is not implemented. Use EMAIL_TRANSPORT=resend with RESEND_API_KEY in production.',
      )
    }
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
