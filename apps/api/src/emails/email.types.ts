export type EmailTemplateName =
  | 'email-verification'
  | 'password-reset'
  | 'welcome'
  | 'security-alert'
  | 'registration-attempt'

export interface EmailMessage {
  to: string
  subject: string
  template: EmailTemplateName
  variables: Record<string, string>
  text: string
  html: string
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>
}

export interface EmailService {
  sendVerificationEmail(input: { to: string; firstName: string; token: string }): Promise<void>
  sendPasswordResetEmail(input: { to: string; firstName: string; token: string }): Promise<void>
  sendWelcomeEmail(input: { to: string; firstName: string }): Promise<void>
  sendRegistrationAttemptEmail(input: { to: string; firstName: string }): Promise<void>
  sendSecurityAlertEmail(input: { to: string; firstName: string; message: string }): Promise<void>
}
