export type EmailTemplateName =
  | 'email-verification'
  | 'password-reset'
  | 'welcome'
  | 'security-alert'
  | 'registration-attempt'
  | 'deposit-submitted'
  | 'deposit-approved'
  | 'deposit-rejected'
  | 'withdrawal-submitted'
  | 'withdrawal-approved'
  | 'withdrawal-rejected'
  | 'kyc-submitted'
  | 'kyc-approved'
  | 'kyc-rejected'
  | 'support-reply'
  | 'admin-alert'
  | 'broadcast'
  | 'custom'

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

  sendDepositSubmitted(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void>
  sendDepositApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void>
  sendDepositRejected(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    reason: string
  }): Promise<void>

  sendWithdrawalSubmitted(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void>
  sendWithdrawalApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
  }): Promise<void>
  sendWithdrawalRejected(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    reason: string
  }): Promise<void>

  sendKycSubmitted(input: { to: string; firstName: string }): Promise<void>
  sendKycApproved(input: { to: string; firstName: string }): Promise<void>
  sendKycRejected(input: { to: string; firstName: string; reason: string }): Promise<void>

  sendSupportReply(input: {
    to: string
    firstName: string
    reference: string
    subject: string
    message: string
  }): Promise<void>

  sendAdminAlert(input: {
    to: string
    alertTitle: string
    alertBody: string
    reference?: string
  }): Promise<void>

  sendBroadcast(input: {
    to: string
    firstName?: string
    title: string
    body: string
  }): Promise<void>

  /** Additive — used by the Phase 6 DB-managed template/outbox engine to dispatch rendered HTML. */
  sendRaw(input: { to: string; subject: string; html: string; text: string }): Promise<void>
}
