import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/**
 * Resend HTTP API transport (https://resend.com/docs/api-reference/emails/send-email).
 * Uses fetch — no SDK dependency required.
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

    const from = `${env.SMTP_FROM_NAME} <${env.SMTP_FROM_ADDRESS}>`
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      logger.error(
        { status: response.status, detail, to: message.to, subject: message.subject },
        'Resend API rejected email',
      )
      throw new Error(`Resend send failed (${response.status})`)
    }

    logger.info(
      { to: message.to, subject: message.subject, template: message.template },
      'Email dispatched via Resend',
    )
  }
}
