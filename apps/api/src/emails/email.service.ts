import { env } from '../config/env.js'
import type { EmailService, EmailTransport } from './email.types.js'
import { renderEmailTemplate } from './templates/index.js'
import { ConsoleEmailTransport } from './transports/console.transport.js'
import { SmtpEmailTransport } from './transports/smtp.transport.js'

function createTransport(): EmailTransport {
  if (env.EMAIL_TRANSPORT === 'smtp') {
    return new SmtpEmailTransport()
  }
  return new ConsoleEmailTransport()
}

class AppEmailService implements EmailService {
  constructor(private readonly transport: EmailTransport) {}

  private async dispatch(
    to: string,
    template: Parameters<typeof renderEmailTemplate>[0],
    variables: Record<string, string>,
  ): Promise<void> {
    const rendered = renderEmailTemplate(template, variables)
    await this.transport.send({
      to,
      subject: rendered.subject,
      template,
      variables,
      text: rendered.text,
      html: rendered.html,
    })
  }

  sendVerificationEmail(input: { to: string; firstName: string; token: string }): Promise<void> {
    return this.dispatch(input.to, 'email-verification', {
      firstName: input.firstName,
      token: input.token,
    })
  }

  sendPasswordResetEmail(input: { to: string; firstName: string; token: string }): Promise<void> {
    return this.dispatch(input.to, 'password-reset', {
      firstName: input.firstName,
      token: input.token,
    })
  }

  sendWelcomeEmail(input: { to: string; firstName: string }): Promise<void> {
    return this.dispatch(input.to, 'welcome', { firstName: input.firstName })
  }

  sendRegistrationAttemptEmail(input: { to: string; firstName: string }): Promise<void> {
    return this.dispatch(input.to, 'registration-attempt', { firstName: input.firstName })
  }

  sendSecurityAlertEmail(input: { to: string; firstName: string; message: string }): Promise<void> {
    return this.dispatch(input.to, 'security-alert', {
      firstName: input.firstName,
      message: input.message,
    })
  }
}

export const emailService: EmailService = new AppEmailService(createTransport())
