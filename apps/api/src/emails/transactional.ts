import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { logger } from '../utils/logger.js'
import { emailService } from './email.service.js'

async function loadUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, firstName: true },
  })
}

async function safe(label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (err) {
    logger.warn({ err, label }, 'Transactional email failed')
  }
}

function adminAlertRecipients(): string[] {
  const raw = env.ADMIN_ALERT_EMAILS?.trim()
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (env.SMTP_FROM_ADDRESS && !env.SMTP_FROM_ADDRESS.includes('localhost')) {
    return [env.SMTP_FROM_ADDRESS]
  }
  return []
}

/** Fire-and-forget transactional mail — never blocks finance/KYC flows. */
export const transactionalMailer = {
  async depositSubmitted(userId: string, input: { reference: string; amount: string }) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('deposit-submitted', () =>
      emailService.sendDepositSubmitted({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        amount: input.amount,
      }),
    )
    await this.adminAlert({
      alertTitle: 'Deposit submitted',
      alertBody: `${user.email} submitted deposit ${input.reference} for ${input.amount}.`,
      reference: input.reference,
    })
  },

  async depositApproved(userId: string, input: { reference: string; amount: string }) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('deposit-approved', () =>
      emailService.sendDepositApproved({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        amount: input.amount,
      }),
    )
  },

  async depositRejected(
    userId: string,
    input: { reference: string; amount: string; reason: string },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('deposit-rejected', () =>
      emailService.sendDepositRejected({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        amount: input.amount,
        reason: input.reason,
      }),
    )
  },

  async withdrawalSubmitted(userId: string, input: { reference: string; amount: string }) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('withdrawal-submitted', () =>
      emailService.sendWithdrawalSubmitted({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        amount: input.amount,
      }),
    )
    await this.adminAlert({
      alertTitle: 'Withdrawal submitted',
      alertBody: `${user.email} requested withdrawal ${input.reference} for ${input.amount}.`,
      reference: input.reference,
    })
  },

  async withdrawalApproved(userId: string, input: { reference: string; amount: string }) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('withdrawal-approved', () =>
      emailService.sendWithdrawalApproved({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        amount: input.amount,
      }),
    )
  },

  async withdrawalRejected(
    userId: string,
    input: { reference: string; amount: string; reason: string },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('withdrawal-rejected', () =>
      emailService.sendWithdrawalRejected({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        amount: input.amount,
        reason: input.reason,
      }),
    )
  },

  async kycSubmitted(userId: string) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-submitted', () =>
      emailService.sendKycSubmitted({ to: user.email, firstName: user.firstName }),
    )
    await this.adminAlert({
      alertTitle: 'KYC submitted',
      alertBody: `${user.email} submitted KYC for review.`,
      reference: user.id,
    })
  },

  async kycApproved(userId: string) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-approved', () =>
      emailService.sendKycApproved({ to: user.email, firstName: user.firstName }),
    )
  },

  async kycRejected(userId: string, reason: string) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-rejected', () =>
      emailService.sendKycRejected({
        to: user.email,
        firstName: user.firstName,
        reason,
      }),
    )
  },

  async supportReply(
    userId: string,
    input: { reference: string; subject: string; message: string },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('support-reply', () =>
      emailService.sendSupportReply({
        to: user.email,
        firstName: user.firstName,
        reference: input.reference,
        subject: input.subject,
        message: input.message,
      }),
    )
  },

  async broadcast(to: string, input: { firstName?: string; title: string; body: string }) {
    await safe('broadcast', () =>
      emailService.sendBroadcast({
        to,
        firstName: input.firstName,
        title: input.title,
        body: input.body,
      }),
    )
  },

  async adminAlert(input: { alertTitle: string; alertBody: string; reference?: string }) {
    const recipients = adminAlertRecipients()
    if (recipients.length === 0) {
      logger.debug({ title: input.alertTitle }, 'No ADMIN_ALERT_EMAILS configured; skipping admin alert')
      return
    }
    for (const to of recipients) {
      await safe('admin-alert', () =>
        emailService.sendAdminAlert({
          to,
          alertTitle: input.alertTitle,
          alertBody: input.alertBody,
          reference: input.reference,
        }),
      )
    }
  },
}
