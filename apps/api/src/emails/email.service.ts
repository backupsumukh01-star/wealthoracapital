import { env } from '../config/env.js'
import type { EmailService, EmailTemplateName, EmailTransport } from './email.types.js'
import { renderEmailTemplate } from './templates/index.js'
import { ConsoleEmailTransport } from './transports/console.transport.js'
import { MailgunEmailTransport } from './transports/mailgun.transport.js'
import { ResendEmailTransport } from './transports/resend.transport.js'
import { SendgridEmailTransport } from './transports/sendgrid.transport.js'
import { SesEmailTransport } from './transports/ses.transport.js'
import { SmtpEmailTransport } from './transports/smtp.transport.js'

function createTransport(): EmailTransport {
  switch (env.EMAIL_TRANSPORT) {
    case 'smtp':
      return new SmtpEmailTransport()
    case 'resend':
      return new ResendEmailTransport()
    case 'sendgrid':
      return new SendgridEmailTransport()
    case 'ses':
      return new SesEmailTransport()
    case 'mailgun':
      return new MailgunEmailTransport()
    case 'console':
    default:
      return new ConsoleEmailTransport()
  }
}

/** Shared transport instance — reused by the Phase 6 DB-managed outbox worker. */
export const activeEmailTransport: EmailTransport = createTransport()

class AppEmailService implements EmailService {
  constructor(private readonly transport: EmailTransport) {}

  private async dispatch(
    to: string,
    template: Exclude<EmailTemplateName, 'custom'>,
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

  sendDepositSubmitted(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void> {
    return this.dispatch(input.to, 'deposit-submitted', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
    })
  }

  sendDepositApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void> {
    return this.dispatch(input.to, 'deposit-approved', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
    })
  }

  sendDepositRejected(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    reason: string
  }): Promise<void> {
    return this.dispatch(input.to, 'deposit-rejected', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      reason: input.reason,
    })
  }

  sendWithdrawalSubmitted(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-submitted', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
    })
  }

  sendWithdrawalApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-approved', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
    })
  }

  sendWithdrawalRejected(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    reason: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-rejected', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      reason: input.reason,
    })
  }

  sendKycSubmitted(input: { to: string; firstName: string }): Promise<void> {
    return this.dispatch(input.to, 'kyc-submitted', { firstName: input.firstName })
  }

  sendKycApproved(input: { to: string; firstName: string }): Promise<void> {
    return this.dispatch(input.to, 'kyc-approved', { firstName: input.firstName })
  }

  sendKycRejected(input: { to: string; firstName: string; reason: string }): Promise<void> {
    return this.dispatch(input.to, 'kyc-rejected', {
      firstName: input.firstName,
      reason: input.reason,
    })
  }

  sendSupportReply(input: {
    to: string
    firstName: string
    reference: string
    subject: string
    message: string
  }): Promise<void> {
    return this.dispatch(input.to, 'support-reply', {
      firstName: input.firstName,
      reference: input.reference,
      subject: input.subject,
      message: input.message,
    })
  }

  sendAdminAlert(input: {
    to: string
    alertTitle: string
    alertBody: string
    reference?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'admin-alert', {
      alertTitle: input.alertTitle,
      alertBody: input.alertBody,
      reference: input.reference ?? '',
    })
  }

  sendBroadcast(input: {
    to: string
    firstName?: string
    title: string
    body: string
  }): Promise<void> {
    return this.dispatch(input.to, 'broadcast', {
      firstName: input.firstName ?? '',
      title: input.title,
      body: input.body,
    })
  }

  async sendRaw(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
    await this.transport.send({
      to: input.to,
      subject: input.subject,
      template: 'custom',
      variables: {},
      text: input.text,
      html: input.html,
    })
  }
}

export const emailService: EmailService = new AppEmailService(activeEmailTransport)
