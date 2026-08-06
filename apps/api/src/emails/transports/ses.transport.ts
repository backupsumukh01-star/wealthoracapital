import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/** Amazon SES transport stub — fails closed in production. */
export class SesEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'EMAIL_TRANSPORT=ses is stubbed. Use EMAIL_TRANSPORT=resend or implement SES delivery.',
      )
    }
    logger.warn(
      { to: message.to, subject: message.subject, region: env.SES_REGION },
      'SES transport stub — message logged only (non-production)',
    )
  }
}
