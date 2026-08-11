import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { logger } from '../utils/logger.js'
import { emailService } from './email.service.js'
import { opsAlertService } from '../services/ops-alert.service.js'

async function loadUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
}

async function safe(label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (err) {
    logger.warn({ err, label }, 'Transactional email failed')
  }
}

function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim()
}

/** Fire-and-forget transactional mail — never blocks finance/KYC flows. */
export const transactionalMailer = {
  async depositSubmitted(
    userId: string,
    input: { reference: string; amount: string; ip?: string | null },
  ) {
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
    await opsAlertService.notify({
      event: 'DEPOSIT_SUBMITTED',
      title: 'Deposit submitted',
      action: 'Investor submitted a deposit for review',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      ip: input.ip,
      adminPath: `/admin/deposits`,
      idempotencyKey: `deposit.submitted:${input.reference}`,
      recordActivity: true,
      activityKind: 'DEPOSIT_SUBMITTED',
    })
  },

  async depositApproved(
    userId: string,
    input: {
      reference: string
      amount: string
      ip?: string | null
      autoConfirmed?: boolean
    },
  ) {
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
    await opsAlertService.notify({
      event: 'DEPOSIT_APPROVED',
      title: 'Deposit approved',
      action: 'Deposit credited to investor wallet',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      ip: input.ip,
      adminPath: `/admin/deposits`,
      idempotencyKey: `deposit.approved:${input.reference}`,
      details: input.autoConfirmed ? { 'Auto-confirmed': 'yes' } : undefined,
    })
  },

  async depositRejected(
    userId: string,
    input: { reference: string; amount: string; reason: string; ip?: string | null },
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
    await opsAlertService.notify({
      event: 'DEPOSIT_REJECTED',
      title: 'Deposit rejected',
      action: 'Deposit was rejected by admin',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      reason: input.reason,
      ip: input.ip,
      adminPath: `/admin/deposits`,
    })
  },

  async withdrawalSubmitted(
    userId: string,
    input: {
      reference: string
      amount: string
      ip?: string | null
      details?: Record<string, string | number | null | undefined>
    },
  ) {
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
    await opsAlertService.notify({
      event: 'WITHDRAWAL_SUBMITTED',
      title: 'Withdrawal submitted',
      action: 'Investor requested a withdrawal',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      ip: input.ip,
      adminPath: `/admin/withdrawals`,
      idempotencyKey: `withdrawal.submitted:${input.reference}`,
      details: input.details,
      recordActivity: true,
      activityKind: 'WITHDRAWAL_SUBMITTED',
    })
  },

  async withdrawalApproved(
    userId: string,
    input: {
      reference: string
      amount: string
      ip?: string | null
      details?: Record<string, string | number | null | undefined>
    },
  ) {
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
    await opsAlertService.notify({
      event: 'WITHDRAWAL_APPROVED',
      title: 'Withdrawal approved',
      action: 'Withdrawal approved for payout',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      ip: input.ip,
      adminPath: `/admin/withdrawals`,
      idempotencyKey: `withdrawal.approved:${input.reference}`,
      details: input.details,
    })
  },

  async withdrawalRejected(
    userId: string,
    input: {
      reference: string
      amount: string
      reason: string
      ip?: string | null
      details?: Record<string, string | number | null | undefined>
    },
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
    await opsAlertService.notify({
      event: 'WITHDRAWAL_REJECTED',
      title: 'Withdrawal rejected',
      action: 'Withdrawal was rejected by admin',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      reason: input.reason,
      ip: input.ip,
      adminPath: `/admin/withdrawals`,
      idempotencyKey: `withdrawal.rejected:${input.reference}`,
      details: input.details,
    })
  },

  async withdrawalPaid(
    userId: string,
    input: {
      reference: string
      amount: string
      ip?: string | null
      details?: Record<string, string | number | null | undefined>
    },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    await opsAlertService.notify({
      event: 'WITHDRAWAL_PAID',
      title: 'Withdrawal paid',
      action: 'Withdrawal marked paid/completed',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      ip: input.ip,
      adminPath: `/admin/withdrawals`,
      idempotencyKey: `withdrawal.paid:${input.reference}`,
      details: input.details,
    })
  },

  async withdrawalCancelled(
    userId: string,
    input: {
      reference: string
      amount: string
      ip?: string | null
      details?: Record<string, string | number | null | undefined>
    },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    await opsAlertService.notify({
      event: 'WITHDRAWAL_CANCELLED',
      title: 'Withdrawal cancelled',
      action: 'Withdrawal was cancelled',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      amount: input.amount,
      reference: input.reference,
      ip: input.ip,
      adminPath: `/admin/withdrawals`,
      idempotencyKey: `withdrawal.cancelled:${input.reference}`,
      details: input.details,
    })
  },

  async kycSubmitted(userId: string, input?: { ip?: string | null; submissionId?: string }) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-submitted', () =>
      emailService.sendKycSubmitted({ to: user.email, firstName: user.firstName }),
    )
    await opsAlertService.notify({
      event: 'KYC_SUBMITTED',
      title: 'KYC submitted',
      action: 'Investor submitted KYC for review',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      reference: input?.submissionId ?? user.id,
      ip: input?.ip,
      adminPath: `/admin/kyc/${user.id}`,
      idempotencyKey: `kyc.submitted:${input?.submissionId ?? user.id}`,
      recordActivity: true,
      activityKind: 'KYC_SUBMITTED',
    })
  },

  async kycApproved(userId: string, input?: { ip?: string | null; submissionId?: string }) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-approved', () =>
      emailService.sendKycApproved({ to: user.email, firstName: user.firstName }),
    )
    await opsAlertService.notify({
      event: 'KYC_APPROVED',
      title: 'KYC approved',
      action: 'KYC approved by admin',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      reference: input?.submissionId ?? user.id,
      ip: input?.ip,
      adminPath: `/admin/kyc/${user.id}`,
      idempotencyKey: `kyc.approved:${input?.submissionId ?? user.id}`,
      recordActivity: true,
      activityKind: 'KYC_APPROVED',
    })
  },

  async kycRejected(
    userId: string,
    reason: string,
    input?: { ip?: string | null; submissionId?: string },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-rejected', () =>
      emailService.sendKycRejected({
        to: user.email,
        firstName: user.firstName,
        reason,
      }),
    )
    await opsAlertService.notify({
      event: 'KYC_REJECTED',
      title: 'KYC rejected',
      action: 'KYC rejected by admin',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      reason,
      reference: input?.submissionId ?? user.id,
      ip: input?.ip,
      adminPath: `/admin/kyc/${user.id}`,
      idempotencyKey: `kyc.rejected:${input?.submissionId ?? user.id}`,
      recordActivity: true,
      activityKind: 'KYC_REJECTED',
    })
  },

  async kycInfoRequested(userId: string, reason: string) {
    const user = await loadUser(userId)
    if (!user) return
    await safe('kyc-info-requested', () =>
      emailService.sendKycRejected({
        to: user.email,
        firstName: user.firstName,
        reason: `More information needed: ${reason}`,
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
    await opsAlertService.notify({
      event: 'SUPPORT_REPLY',
      title: 'Support reply sent',
      action: 'Admin replied to support ticket',
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      reference: input.reference,
      adminPath: `/admin/support`,
      details: { Subject: input.subject },
    })
  },

  async dailyReturn(
    userId: string,
    input: {
      date: string
      returnPct: string
      profit: string
      investment: string
      openingBalance: string
      closingBalance: string
      reference: string
      /** Cumulative investment profit through this settlement (not today's profit). */
      earningsTillDate: string
    },
  ) {
    const user = await loadUser(userId)
    if (!user) return
    let shareProgressUrl = ''
    try {
      const { progressShareService } = await import('../services/progress-share/progress-share.service.js')
      const link = await progressShareService.createLink(userId)
      shareProgressUrl = link.shareUrl
    } catch {
      // Never block Daily Profit email if share-link minting fails.
      shareProgressUrl = ''
    }
    await safe('daily-return', () =>
      emailService.sendDailyRoi({
        to: user.email,
        firstName: user.firstName,
        returnPct: input.returnPct,
        profit: input.profit,
        openingBalance: input.openingBalance,
        closingBalance: input.closingBalance,
        portfolioValue: input.closingBalance,
        investmentValue: input.investment,
        totalProfit: input.earningsTillDate,
        earningsTillDate: input.earningsTillDate,
        date: input.date,
        reference: input.reference,
        shareProgressUrl,
      }),
    )
  },

  async dailySettlementOwner(input: {
    date: string
    returnPct: string
    eligibleUsers: number
    successfulUsers: number
    failedUsers: number
    totalDistributed: string
    durationMs: number
    reference: string
    failures?: Array<{ userId: string; error: string }>
  }) {
    const recipients = (env.ADMIN_ALERT_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    if (recipients.length === 0) {
      logger.debug('No ADMIN_ALERT_EMAILS configured; skipping owner settlement email')
      return
    }
    const durationSec = (input.durationMs / 1000).toFixed(1)
    const failLines =
      (input.failures ?? [])
        .map((f) => `• ${f.userId}: ${f.error}`)
        .join('\n') || 'None'
    const html = `
      <h2>Daily Settlement Completed</h2>
      <p>Settlement date: <strong>${input.date}</strong></p>
      <ul>
        <li>Return %: <strong>${input.returnPct}%</strong></li>
        <li>Eligible users: <strong>${input.eligibleUsers}</strong></li>
        <li>Successful users: <strong>${input.successfulUsers}</strong></li>
        <li>Failed users: <strong>${input.failedUsers}</strong></li>
        <li>Total distributed: <strong>$${input.totalDistributed}</strong></li>
        <li>Execution time: <strong>${durationSec}s</strong></li>
        <li>Reference: <strong>${input.reference}</strong></li>
      </ul>
      <p>Failures:</p>
      <pre>${failLines}</pre>
    `
    for (const to of recipients) {
      await safe('daily-settlement-owner', () =>
        emailService.sendRaw({
          to,
          subject: 'Daily Settlement Completed',
          html,
          text: `Daily Settlement Completed\nDate: ${input.date}\nReturn: ${input.returnPct}%\nEligible: ${input.eligibleUsers}\nSuccessful: ${input.successfulUsers}\nFailed: ${input.failedUsers}\nDistributed: $${input.totalDistributed}\nDuration: ${durationSec}s\nRef: ${input.reference}\nFailures:\n${failLines}`,
          category: 'Investment',
        }),
      )
    }
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

  /** @deprecated Prefer opsAlertService.notify — kept for callers that still pass free-form text. */
  async adminAlert(input: { alertTitle: string; alertBody: string; reference?: string }) {
    const recipients = opsAlertService.recipients()
    if (recipients.length === 0 && !(env.SMTP_FROM_ADDRESS && !env.SMTP_FROM_ADDRESS.includes('localhost'))) {
      logger.debug({ title: input.alertTitle }, 'No ADMIN_ALERT_EMAILS configured; skipping admin alert')
      return
    }
    await opsAlertService.notify({
      event: 'SYSTEM_ERROR',
      title: input.alertTitle,
      action: input.alertBody,
      reference: input.reference,
    })
  },
}
