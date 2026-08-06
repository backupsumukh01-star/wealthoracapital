import { env } from '../config/env.js'
import type { EmailService, EmailTemplateName, EmailTransport } from './email.types.js'
import { senderForCategory } from './sender.js'
import { renderEmailTemplate, TEMPLATE_CATEGORY } from './templates/index.js'
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
    const category = TEMPLATE_CATEGORY[template]
    const from = senderForCategory(category).formatted
    await this.transport.send({
      to,
      subject: rendered.subject,
      template,
      variables,
      text: rendered.text,
      html: rendered.html,
      from,
      category,
    })
  }

  sendVerificationEmail(input: { to: string; firstName: string; token: string }): Promise<void> {
    return this.dispatch(input.to, 'email-verification', {
      firstName: input.firstName,
      token: input.token,
    })
  }

  sendPasswordResetEmail(input: {
    to: string
    firstName: string
    token: string
    ip?: string
    browser?: string
    time?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'password-reset', {
      firstName: input.firstName,
      token: input.token,
      ip: input.ip ?? '',
      browser: input.browser ?? '',
      time: input.time ?? new Date().toISOString(),
    })
  }

  sendWelcomeEmail(input: {
    to: string
    firstName: string
    username?: string
    userId?: string
    registeredAt?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'welcome', {
      firstName: input.firstName,
      username: input.username ?? input.to.split('@')[0] ?? '',
      userId: input.userId ?? '',
      registeredAt: input.registeredAt ?? new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19) + 'Z',
    })
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
  }): Promise<void> {
    return this.dispatch(input.to, 'login-otp', {
      firstName: input.firstName,
      otp: input.otp,
      ip: input.ip ?? '',
      browser: input.browser ?? '',
      os: input.os ?? '',
      country: input.country ?? '',
      device: input.device ?? '',
      time: input.time ?? new Date().toISOString(),
    })
  }

  sendWithdrawalOtp(input: {
    to: string
    firstName: string
    otp: string
    amount?: string
    wallet?: string
    network?: string
    withdrawalId?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-otp', {
      firstName: input.firstName,
      otp: input.otp,
      amount: input.amount ?? '',
      wallet: input.wallet ?? '',
      network: input.network ?? '',
      withdrawalId: input.withdrawalId ?? '',
    })
  }

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
  }): Promise<void> {
    return this.dispatch(input.to, 'deposit-submitted', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      method: input.method ?? '',
      date: input.date ?? new Date().toISOString().slice(0, 10),
      time: input.time ?? new Date().toISOString().slice(11, 19) + 'Z',
      status: input.status ?? 'Pending review',
    })
  }

  sendDepositApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    walletBalance?: string
    approvalTime?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'deposit-approved', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      walletBalance: input.walletBalance ?? '',
      approvalTime: input.approvalTime ?? new Date().toISOString(),
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
    wallet?: string
    network?: string
    date?: string
    time?: string
    status?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-submitted', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      wallet: input.wallet ?? '',
      network: input.network ?? '',
      date: input.date ?? new Date().toISOString().slice(0, 10),
      time: input.time ?? new Date().toISOString().slice(11, 19) + 'Z',
      status: input.status ?? 'Under review',
    })
  }

  sendWithdrawalApproved(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    fee?: string
    netAmount?: string
    destination?: string
    approvalTime?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-approved', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      fee: input.fee ?? '',
      netAmount: input.netAmount ?? input.amount,
      destination: input.destination ?? '',
      approvalTime: input.approvalTime ?? new Date().toISOString(),
    })
  }

  sendWithdrawalRejected(input: {
    to: string
    firstName: string
    reference: string
    amount: string
    reason: string
    date?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'withdrawal-rejected', {
      firstName: input.firstName,
      reference: input.reference,
      amount: input.amount,
      reason: input.reason,
      date: input.date ?? new Date().toISOString().slice(0, 10),
    })
  }

  sendKycSubmitted(input: {
    to: string
    firstName: string
    submissionId?: string
    submittedAt?: string
    documents?: string
    status?: string
    eta?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'kyc-submitted', {
      firstName: input.firstName,
      submissionId: input.submissionId ?? '',
      submittedAt: input.submittedAt ?? new Date().toISOString(),
      documents: input.documents ?? 'ID · Selfie · Address proof',
      status: input.status ?? 'Under review',
      eta: input.eta ?? '24–48 hours',
    })
  }

  sendKycUnderReview(input: {
    to: string
    firstName: string
    stage?: string
    eta?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'kyc-under-review', {
      firstName: input.firstName,
      stage: input.stage ?? 'Under review',
      eta: input.eta ?? '24–48 hours',
    })
  }

  sendKycApproved(input: {
    to: string
    firstName: string
    verifiedName?: string
    approvedAt?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'kyc-approved', {
      firstName: input.firstName,
      verifiedName: input.verifiedName ?? input.firstName,
      approvedAt: input.approvedAt ?? new Date().toISOString(),
    })
  }

  sendKycRejected(input: {
    to: string
    firstName: string
    reason: string
    submittedAt?: string
    reviewedAt?: string
    rejectedBy?: string
    corrections?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'kyc-rejected', {
      firstName: input.firstName,
      reason: input.reason,
      submittedAt: input.submittedAt ?? '',
      reviewedAt: input.reviewedAt ?? new Date().toISOString(),
      rejectedBy: input.rejectedBy ?? 'Compliance',
      corrections: input.corrections ?? input.reason,
    })
  }

  sendDailyRoi(input: {
    to: string
    firstName: string
    returnPct?: string
    profit?: string
    openingBalance?: string
    closingBalance?: string
    portfolioValue?: string
    totalProfit?: string
    investmentValue?: string
    monthlyProfit?: string
    date?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'daily-roi', {
      firstName: input.firstName,
      returnPct: input.returnPct ?? '0.00',
      profit: input.profit ?? '',
      openingBalance: input.openingBalance ?? '',
      closingBalance: input.closingBalance ?? '',
      portfolioValue: input.portfolioValue ?? '',
      totalProfit: input.totalProfit ?? '',
      investmentValue: input.investmentValue ?? '',
      monthlyProfit: input.monthlyProfit ?? '',
      date: input.date ?? new Date().toISOString().slice(0, 10),
      sparkline: '0.3,0.5,0.4,0.7,0.6,0.9,1.0',
    })
  }

  sendInvestmentCreated(input: {
    to: string
    firstName: string
    plan?: string
    amount?: string
    expectedRoi?: string
    startDate?: string
    maturityDate?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'investment-created', {
      firstName: input.firstName,
      plan: input.plan ?? '',
      amount: input.amount ?? '',
      expectedRoi: input.expectedRoi ?? '',
      startDate: input.startDate ?? '',
      maturityDate: input.maturityDate ?? '',
    })
  }

  sendInvestmentCompleted(input: {
    to: string
    firstName: string
    duration?: string
    totalProfit?: string
    totalReturned?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'investment-completed', {
      firstName: input.firstName,
      duration: input.duration ?? '',
      totalProfit: input.totalProfit ?? '',
      totalReturned: input.totalReturned ?? '',
    })
  }

  sendSupportReply(input: {
    to: string
    firstName: string
    reference: string
    subject: string
    message: string
    agentName?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'support-reply', {
      firstName: input.firstName,
      reference: input.reference,
      subject: input.subject,
      message: input.message,
      agentName: input.agentName ?? 'Growzy Support',
    })
  }

  sendAdminAlert(input: {
    to: string
    alertTitle: string
    alertBody: string
    reference?: string
    adminLink?: string
    fields?: Record<string, string>
  }): Promise<void> {
    return this.dispatch(input.to, 'admin-alert', {
      alertTitle: input.alertTitle,
      alertBody: input.alertBody,
      reference: input.reference ?? '',
      adminLink: input.adminLink ?? '',
      fieldsJson: input.fields ? JSON.stringify(input.fields) : '',
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
      kind: 'Announcement',
    })
  }

  sendPlatformNotification(input: {
    to: string
    firstName?: string
    title: string
    body: string
    kind?: string
  }): Promise<void> {
    return this.dispatch(input.to, 'platform-notification', {
      firstName: input.firstName ?? '',
      title: input.title,
      body: input.body,
      kind: input.kind ?? 'Announcement',
    })
  }

  async sendRaw(input: {
    to: string
    subject: string
    html: string
    text: string
    from?: string
  }): Promise<void> {
    await this.transport.send({
      to: input.to,
      subject: input.subject,
      template: 'custom',
      variables: {},
      text: input.text,
      html: input.html,
      from: input.from ?? senderForCategory('System').formatted,
      category: 'System',
    })
  }
}

export const emailService: EmailService = new AppEmailService(activeEmailTransport)
