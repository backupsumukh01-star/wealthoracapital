export type EmailCategory =
  | 'Security'
  | 'Finance'
  | 'Support'
  | 'KYC'
  | 'Investment'
  | 'System'

export type EmailTemplateName =
  | 'email-verification'
  | 'password-reset'
  | 'welcome'
  | 'security-alert'
  | 'registration-attempt'
  | 'login-otp'
  | 'withdrawal-otp'
  | 'deposit-submitted'
  | 'deposit-approved'
  | 'deposit-rejected'
  | 'withdrawal-submitted'
  | 'withdrawal-approved'
  | 'withdrawal-rejected'
  | 'kyc-submitted'
  | 'kyc-under-review'
  | 'kyc-approved'
  | 'kyc-rejected'
  | 'daily-roi'
  | 'investment-created'
  | 'investment-completed'
  | 'support-reply'
  | 'admin-alert'
  | 'broadcast'
  | 'platform-notification'
  | 'custom'

export interface EmailMessage {
  to: string
  subject: string
  template: EmailTemplateName
  variables: Record<string, string>
  text: string
  html: string
  /** Absolute From header, e.g. Wealthora Capital <update@wealthoracapital.net> */
  from?: string
  category?: EmailCategory
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>
}

export interface EmailService {
  sendVerificationEmail(input: { to: string; firstName: string; token: string }): Promise<void>
  sendPasswordResetEmail(input: {
    to: string
    firstName: string
    token: string
    ip?: string
    browser?: string
    time?: string
  }): Promise<void>
  sendWelcomeEmail(input: {
    to: string
    firstName: string
    username?: string
    userId?: string
    registeredAt?: string
  }): Promise<void>
  sendRegistrationAttemptEmail(input: { to: string; firstName: string }): Promise<void>
  sendSecurityAlertEmail(input: { to: string; firstName: string; message: string }): Promise<void>

  sendLoginOtp(input: {
    to: string
    firstName: string
    otp: string
    ip?: string
    browser?: string
    os?: string
    country?: string
    device?: string
    time?: string
  }): Promise<void>

  sendWithdrawalOtp(input: {
    to: string
    firstName: string
    otp: string
    amount?: string
    wallet?: string
    network?: string
    withdrawalId?: string
  }): Promise<void>

  sendDepositSubmitted(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    currency?: string
    method?: string
    date?: string
    time?: string
    status?: string
  }): Promise<void>
  sendDepositApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    walletBalance?: string
    approvalTime?: string
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
    wallet?: string
    network?: string
    date?: string
    time?: string
    status?: string
  }): Promise<void>
  sendWithdrawalApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    fee?: string
    netAmount?: string
    destination?: string
    approvalTime?: string
  }): Promise<void>
  sendWithdrawalRejected(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    reason: string
    date?: string
  }): Promise<void>

  sendKycSubmitted(input: {
    to: string
    firstName: string
    submissionId?: string
    submittedAt?: string
    documents?: string
    status?: string
    eta?: string
  }): Promise<void>
  sendKycUnderReview(input: {
    to: string
    firstName: string
    stage?: string
    eta?: string
  }): Promise<void>
  sendKycApproved(input: {
    to: string
    firstName: string
    verifiedName?: string
    approvedAt?: string
  }): Promise<void>
  sendKycRejected(input: {
    to: string
    firstName: string
    reason: string
    submittedAt?: string
    reviewedAt?: string
    rejectedBy?: string
    corrections?: string
  }): Promise<void>

  sendDailyRoi(input: {
    to: string
    firstName: string
    returnPct?: string
    profit?: string
    openingBalance?: string
    closingBalance?: string
    portfolioValue?: string
    totalProfit?: string
    earningsTillDate?: string
    investmentValue?: string
    monthlyProfit?: string
    date?: string
    reference?: string
    shareProgressUrl?: string
  }): Promise<void>

  sendInvestmentCreated(input: {
    to: string
    firstName: string
    plan?: string
    amount?: string
    expectedRoi?: string
    startDate?: string
    maturityDate?: string
  }): Promise<void>

  sendInvestmentCompleted(input: {
    to: string
    firstName: string
    duration?: string
    totalProfit?: string
    totalReturned?: string
  }): Promise<void>

  sendSupportReply(input: {
    to: string
    firstName: string
    reference: string
    subject: string
    message: string
    agentName?: string
  }): Promise<void>

  sendAdminAlert(input: {
    to: string
    alertTitle: string
    alertBody: string
    reference?: string
    adminLink?: string
    fields?: Record<string, string>
  }): Promise<void>

  sendBroadcast(input: {
    to: string
    firstName?: string
    title: string
    body: string
  }): Promise<void>

  sendPlatformNotification(input: {
    to: string
    firstName?: string
    title: string
    body: string
    kind?: string
  }): Promise<void>

  /** Additive — used by the Phase 6 DB-managed template/outbox engine to dispatch rendered HTML. */
  sendRaw(input: {
    to: string
    subject: string
    html: string
    text: string
    from?: string
    category?: 'Security' | 'Finance' | 'Support' | 'KYC' | 'Investment' | 'System'
  }): Promise<void>
}
