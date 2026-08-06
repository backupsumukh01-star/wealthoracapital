import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

export class ConsoleEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      {
        email: {
          to: message.to,
          from: message.from,
          category: message.category,
          subject: message.subject,
          template: message.template,
          variables: message.variables,
        },
      },
      'Email queued (console transport)',
    )
  }
}
