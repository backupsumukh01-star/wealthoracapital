import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/** Amazon SES transport stub — logs intent until AWS credentials are wired to the SES SDK. */
export class SesEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (!env.SES_ACCESS_KEY_ID || !env.SES_SECRET_ACCESS_KEY) {
      logger.warn(
        { to: message.to, subject: message.subject, region: env.SES_REGION },
        'SES transport selected but AWS credentials are not set; message logged only',
      )
      return
    }
    logger.info(
      { to: message.to, subject: message.subject, template: message.template, region: env.SES_REGION },
      'Email dispatched via Amazon SES (stub — integrate @aws-sdk/client-sesv2 for live delivery)',
    )
  }
}
