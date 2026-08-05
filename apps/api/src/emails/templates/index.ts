import { env } from '../../config/env.js'
import type { EmailTemplateName } from '../email.types.js'
import { detailRows, emailLayout, escapeHtml } from '../layout.js'

interface RenderedEmail {
  subject: string
  text: string
  html: string
}

function dashboardUrl(path = '/dashboard'): string {
  return `${env.APP_URL.replace(/\/$/, '')}${path}`
}

function greeting(firstName: string): string {
  return `<p style="margin:0 0 12px">Hi ${escapeHtml(firstName || 'there')},</p>`
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  variables: Record<string, string>,
): RenderedEmail {
  const v = variables

  switch (template) {
    case 'email-verification': {
      const link = `${env.APP_URL}/verify-email?token=${encodeURIComponent(v.token ?? '')}`
      return {
        subject: `Verify your ${env.APP_NAME} email`,
        text: `Hi ${v.firstName},\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
        html: emailLayout({
          title: 'Verify your email',
          preheader: 'Confirm your email to activate your account',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Confirm your email address to finish setting up your ${escapeHtml(env.APP_NAME)} account. This link expires in 24 hours.</p>`,
          cta: { label: 'Verify email', href: link },
        }),
      }
    }
    case 'password-reset': {
      const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(v.token ?? '')}`
      return {
        subject: `Reset your ${env.APP_NAME} password`,
        text: `Hi ${v.firstName},\n\nReset your password: ${link}\n\nThis link expires in 1 hour.`,
        html: emailLayout({
          title: 'Reset your password',
          preheader: 'Password reset link — expires in 1 hour',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">We received a request to reset your password. If you did not request this, you can ignore this email.</p>`,
          cta: { label: 'Reset password', href: link },
        }),
      }
    }
    case 'welcome':
      return {
        subject: `Welcome to ${env.APP_NAME}`,
        text: `Hi ${v.firstName},\n\nYour email is verified. Welcome aboard.`,
        html: emailLayout({
          title: `Welcome to ${env.APP_NAME}`,
          preheader: 'Your account is ready',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your email is verified. Complete KYC to unlock deposits and start investing.</p>`,
          cta: { label: 'Open dashboard', href: dashboardUrl() },
        }),
      }
    case 'registration-attempt':
      return {
        subject: `Registration attempt on your ${env.APP_NAME} account`,
        text: `Hi ${v.firstName},\n\nSomeone tried to register using your email. If this was you, sign in or reset your password.`,
        html: emailLayout({
          title: 'Registration attempt',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Someone tried to register using your email. If this was you, sign in or reset your password. If not, we recommend securing your account.</p>`,
          cta: { label: 'Sign in', href: `${env.APP_URL}/login` },
        }),
      }
    case 'security-alert':
      return {
        subject: `${env.APP_NAME} security alert`,
        text: `Hi ${v.firstName},\n\n${v.message}`,
        html: emailLayout({
          title: 'Security alert',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">${escapeHtml(v.message ?? '')}</p>`,
          cta: { label: 'Review security', href: dashboardUrl('/dashboard/settings') },
        }),
      }
    case 'deposit-submitted':
      return {
        subject: `Deposit ${v.reference} received`,
        text: `Hi ${v.firstName},\n\nYour deposit ${v.reference} for ${v.amount} is pending review.`,
        html: emailLayout({
          title: 'Deposit submitted',
          preheader: `Deposit ${v.reference} is pending review`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">We received your deposit and it is pending review.</p>${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Status', 'Pending review'],
          ])}`,
          cta: { label: 'View wallet', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'deposit-approved':
      return {
        subject: `Deposit ${v.reference} approved`,
        text: `Hi ${v.firstName},\n\nDeposit ${v.reference} was approved for ${v.amount}.`,
        html: emailLayout({
          title: 'Deposit approved',
          preheader: `${v.amount} credited to your wallet`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your deposit was approved and credited to your wallet.</p>${detailRows([
            ['Reference', v.reference ?? ''],
            ['Credited', v.amount ?? ''],
            ['Status', 'Approved'],
          ])}`,
          cta: { label: 'View wallet', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'deposit-rejected':
      return {
        subject: `Deposit ${v.reference} rejected`,
        text: `Hi ${v.firstName},\n\nDeposit ${v.reference} was rejected. ${v.reason}`,
        html: emailLayout({
          title: 'Deposit rejected',
          preheader: `Deposit ${v.reference} was not approved`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your deposit could not be approved.</p>${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Reason', v.reason ?? ''],
          ])}`,
          cta: { label: 'Try again', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'withdrawal-submitted':
      return {
        subject: `Withdrawal ${v.reference} under review`,
        text: `Hi ${v.firstName},\n\nYour withdrawal ${v.reference} for ${v.amount} is under review.`,
        html: emailLayout({
          title: 'Withdrawal submitted',
          preheader: `Withdrawal ${v.reference} is under review`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your withdrawal request is under review. Funds remain locked until the request is completed or rejected.</p>${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Status', 'Under review'],
          ])}`,
          cta: { label: 'View wallet', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'withdrawal-approved':
      return {
        subject: `Withdrawal ${v.reference} approved`,
        text: `Hi ${v.firstName},\n\nWithdrawal ${v.reference} for ${v.amount} was approved and will be processed.`,
        html: emailLayout({
          title: 'Withdrawal approved',
          preheader: `Withdrawal ${v.reference} approved`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your withdrawal was approved and is being processed for payout.</p>${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Status', 'Approved'],
          ])}`,
          cta: { label: 'View wallet', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'withdrawal-rejected':
      return {
        subject: `Withdrawal ${v.reference} rejected`,
        text: `Hi ${v.firstName},\n\nWithdrawal ${v.reference} was rejected. ${v.reason}`,
        html: emailLayout({
          title: 'Withdrawal rejected',
          preheader: `Withdrawal ${v.reference} was not approved`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your withdrawal was rejected and locked funds have been released back to your wallet.</p>${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Reason', v.reason ?? ''],
          ])}`,
          cta: { label: 'View wallet', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'kyc-submitted':
      return {
        subject: 'Identity verification received',
        text: `Hi ${v.firstName},\n\nYour verification documents are under review.`,
        html: emailLayout({
          title: 'KYC submitted',
          preheader: 'Your documents are under review',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">We received your identity verification documents. Our compliance team will review them shortly.</p>`,
          cta: { label: 'Check KYC status', href: dashboardUrl('/onboarding') },
        }),
      }
    case 'kyc-approved':
      return {
        subject: 'Your identity verification is approved',
        text: `Hi ${v.firstName},\n\nYour identity verification has been approved.`,
        html: emailLayout({
          title: 'KYC approved',
          preheader: 'You can now deposit and withdraw',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Your identity verification was approved. You can now deposit funds and request withdrawals.</p>`,
          cta: { label: 'Go to wallet', href: dashboardUrl('/dashboard/wallet') },
        }),
      }
    case 'kyc-rejected':
      return {
        subject: 'Your identity verification needs attention',
        text: `Hi ${v.firstName},\n\n${v.reason}`,
        html: emailLayout({
          title: 'KYC needs attention',
          preheader: 'Please review and resubmit',
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">We could not approve your verification.</p>${detailRows([
            ['Reason', v.reason ?? ''],
          ])}<p style="margin:12px 0 0">Please update your documents and resubmit.</p>`,
          cta: { label: 'Update KYC', href: dashboardUrl('/onboarding') },
        }),
      }
    case 'support-reply':
      return {
        subject: `New reply on ticket ${v.reference}`,
        text: `Hi ${v.firstName},\n\nSupport replied to "${v.subject}" (${v.reference}):\n\n${v.message}`,
        html: emailLayout({
          title: 'Support replied',
          preheader: `Reply on ticket ${v.reference}`,
          bodyHtml: `${greeting(v.firstName ?? '')}<p style="margin:0">Our team replied to your support ticket.</p>${detailRows([
            ['Ticket', v.reference ?? ''],
            ['Subject', v.subject ?? ''],
          ])}<p style="margin:16px 0 0;padding:14px;background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0">${escapeHtml(v.message ?? '')}</p>`,
          cta: { label: 'Open support', href: dashboardUrl('/dashboard/support') },
        }),
      }
    case 'admin-alert':
      return {
        subject: `[Alert] ${v.alertTitle}`,
        text: `${v.alertTitle}\n\n${v.alertBody}${v.reference ? `\n\nRef: ${v.reference}` : ''}`,
        html: emailLayout({
          title: v.alertTitle ?? 'Admin alert',
          preheader: 'Internal operations alert',
          bodyHtml: `<p style="margin:0">${escapeHtml(v.alertBody ?? '')}</p>${
            v.reference
              ? detailRows([['Reference', v.reference]])
              : ''
          }`,
          cta: { label: 'Open admin', href: `${env.APP_URL.replace(/\/$/, '')}/admin` },
        }),
      }
    case 'broadcast':
      return {
        subject: v.title ?? `${env.APP_NAME} update`,
        text: `${v.title}\n\n${v.body}`,
        html: emailLayout({
          title: v.title ?? 'Update',
          preheader: v.title,
          bodyHtml: `${v.firstName ? greeting(v.firstName) : ''}<p style="margin:0;white-space:pre-wrap">${escapeHtml(v.body ?? '')}</p>`,
          cta: { label: 'Open Growzy', href: dashboardUrl() },
        }),
      }
    case 'custom':
      throw new Error('The "custom" template must be rendered via emailTemplateService, not renderEmailTemplate.')
    default: {
      const exhaustive: never = template
      throw new Error(`Unhandled email template: ${String(exhaustive)}`)
    }
  }
}

/** All production transactional templates (excludes auth helpers used only by auth service). */
export const PRODUCTION_EMAIL_TEMPLATES: EmailTemplateName[] = [
  'deposit-submitted',
  'deposit-approved',
  'deposit-rejected',
  'withdrawal-submitted',
  'withdrawal-approved',
  'withdrawal-rejected',
  'kyc-submitted',
  'kyc-approved',
  'kyc-rejected',
  'support-reply',
  'admin-alert',
  'broadcast',
]
