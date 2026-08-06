import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import type { EmailMessage, EmailTransport } from '../email.types.js'

/**
 * Resend HTTP API transport (https://resend.com/docs/api-reference/emails/send-email).
 * Uses fetch — no SDK dependency required.
 * Prefer message.from (lane routing); fall back to SMTP_FROM_* for legacy.
 */
export class ResendEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    if (!env.RESEND_API_KEY?.trim()) {
      throw new Error('RESEND_API_KEY is not configured for EMAIL_TRANSPORT=resend')
    }

    const from =
      message.from?.trim() ||
      `${env.SMTP_FROM_NAME} <${env.SMTP_FROM_ADDRESS}>`

    if (!from.includes('@') || from.includes('localhost')) {
      throw new Error('A verified sender address is required for Resend (EMAIL_FROM_* / SMTP_FROM_ADDRESS)')
    }

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
        { status: response.status, detail, to: message.to, subject: message.subject, from },
        'Resend API rejected email',
      )
      throw new Error(`Resend send failed (${response.status})`)
    }

    logger.info(
      {
        to: message.to,
        subject: message.subject,
        template: message.template,
        from,
        category: message.category,
      },
      'Email dispatched via Resend',
    )
  }
}
