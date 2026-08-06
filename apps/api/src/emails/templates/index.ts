import { env } from '../../config/env.js'
import type { EmailTemplateName } from '../email.types.js'
import {
  detailRows,
  emailLayout,
  escapeHtml,
  greeting,
  highlightCard,
  otpCard,
  paragraph,
  statusBadge,
  timeline,
} from '../layout.js'

interface RenderedEmail {
  subject: string
  text: string
  html: string
}

function appUrl(path: string): string {
  const base = env.APP_URL.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

function dashboardUrl(path = '/dashboard'): string {
  return appUrl(path)
}

function secureAccountUrl(): string {
  return dashboardUrl('/dashboard/settings')
}

/** Mini sparkline as HTML bars (email-safe, no images required). */
function miniPerformanceGraph(pcts: string): string {
  const values = pcts
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
  if (values.length === 0) {
    values.push(0.4, 0.6, 0.5, 0.8, 0.7, 1, 0.9)
  }
  const max = Math.max(...values.map(Math.abs), 0.01)
  const bars = values
    .map((v) => {
      const h = Math.max(8, Math.round((Math.abs(v) / max) * 48))
      const color = v >= 0 ? '#3DDC97' : '#FF6B6B'
      return `<td valign="bottom" align="center" style="padding:0 3px"><div style="width:10px;height:${h}px;background:${color};border-radius:3px 3px 0 0"></div></td>`
    })
    .join('')
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0 4px"><tr>${bars}</tr></table>
    <p style="margin:0;font-size:11px;color:#5C6B7E">7-day performance snapshot</p>`
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  variables: Record<string, string>,
): RenderedEmail {
  const v = variables

  switch (template) {
    case 'email-verification': {
      const link = appUrl(`/verify-email?token=${encodeURIComponent(v.token ?? '')}`)
      return {
        subject: `Verify your ${env.APP_NAME} email`,
        text: `Hi ${v.firstName},\n\nVerify your email: ${link}\n\nExpires in 24 hours.\n\nGrowzy will never ask for your password or OTP.`,
        html: emailLayout({
          category: 'Security',
          title: 'Verify your email',
          preheader: 'Confirm your email to activate your account — expires in 24 hours',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            `Confirm your email address to finish setting up your ${escapeHtml(env.APP_NAME)} account.`,
          )}${detailRows([
            ['Expiry', v.expiry ?? '24 hours'],
            ['Security', 'Never share this link'],
          ])}`,
          ctas: [{ label: 'Verify email', href: link }],
        }),
      }
    }
    case 'password-reset': {
      const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(v.token ?? '')}`
      return {
        subject: `Reset your ${env.APP_NAME} password`,
        text: `Hi ${v.firstName},\n\nReset: ${link}\nExpires in 1 hour.\nIP: ${v.ip ?? '—'}\nBrowser: ${v.browser ?? '—'}`,
        html: emailLayout({
          category: 'Security',
          title: 'Reset your password',
          preheader: 'Password reset link — expires in 1 hour',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'We received a request to reset your password. If you did not request this, you can ignore this email.',
          )}${detailRows([
            ['Expiry', v.expiry ?? '1 hour'],
            ['IP address', v.ip ?? '—'],
            ['Browser', v.browser ?? '—'],
            ['Time', v.time ?? new Date().toISOString()],
          ])}`,
          ctas: [{ label: 'Reset password', href: link }],
        }),
      }
    }
    case 'welcome':
      return {
        subject: `Welcome to ${env.APP_NAME}`,
        text: `Hi ${v.firstName},\n\nWelcome. User ID: ${v.userId ?? ''}\nComplete KYC to unlock deposits.`,
        html: emailLayout({
          category: 'Security',
          title: `Welcome to ${env.APP_NAME}`,
          preheader: 'Your account is ready — complete KYC to unlock investing',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your account is ready. Complete identity verification to unlock deposits and withdrawals.',
          )}${detailRows([
            ['Name', v.firstName ?? ''],
            ['Username', v.username ?? ''],
            ['User ID', v.userId ?? ''],
            ['Registration', v.registeredAt ?? ''],
            ['Time', v.time ?? ''],
          ])}${statusBadge('Account active', 'success')}`,
          ctas: [
            { label: 'Open dashboard', href: dashboardUrl() },
            { label: 'Complete KYC', href: dashboardUrl('/onboarding'), variant: 'secondary' },
            { label: 'Contact support', href: dashboardUrl('/dashboard/support'), variant: 'secondary' },
          ],
        }),
      }
    case 'registration-attempt':
      return {
        subject: `Registration attempt on your ${env.APP_NAME} account`,
        text: `Hi ${v.firstName},\n\nSomeone tried to register using your email.`,
        html: emailLayout({
          category: 'Security',
          title: 'Registration attempt',
          preheader: 'Someone tried to register with your email',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Someone tried to register using your email. If this was you, sign in or reset your password. If not, secure your account immediately.',
          )}`,
          ctas: [
            { label: 'Sign in', href: `${env.APP_URL}/login` },
            { label: 'Secure account', href: secureAccountUrl(), variant: 'secondary' },
          ],
        }),
      }
    case 'security-alert':
      return {
        subject: `${env.APP_NAME} security alert`,
        text: `Hi ${v.firstName},\n\n${v.message}`,
        html: emailLayout({
          category: 'Security',
          title: 'Security alert',
          preheader: 'Important security notice for your account',
          bodyHtml: `${greeting(v.firstName ?? '')}${highlightCard(
            `<p style="margin:0;color:#E8EEF6;font-size:14px">${escapeHtml(v.message ?? '')}</p>`,
          )}`,
          ctas: [{ label: 'Review security', href: secureAccountUrl() }],
        }),
      }
    case 'login-otp':
      return {
        subject: `${env.APP_NAME} login code: ${v.otp ?? ''}`,
        text: `Hi ${v.firstName},\n\nYour login OTP is ${v.otp}. Expires in 10 minutes.\nIP: ${v.ip}\nBrowser: ${v.browser}\nOS: ${v.os}\nIf this wasn't you, secure your account.`,
        html: emailLayout({
          category: 'Security',
          title: 'Your login code',
          preheader: 'Use this one-time code to finish signing in — expires in 10 minutes',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Enter this code to complete sign-in. It expires in <strong style="color:#E8EEF6">10 minutes</strong>.',
          )}${otpCard(v.otp ?? '------')}${detailRows([
            ['IP address', v.ip ?? '—'],
            ['Browser', v.browser ?? '—'],
            ['Operating system', v.os ?? '—'],
            ['Country', v.country ?? '—'],
            ['Device', v.device ?? '—'],
            ['Time', v.time ?? new Date().toISOString()],
          ])}${paragraph(
            `<span style="color:#FF6B6B">If this wasn't you</span>, secure your account immediately.`,
          )}`,
          ctas: [{ label: 'Secure account', href: secureAccountUrl(), variant: 'danger' }],
        }),
      }
    case 'withdrawal-otp':
      return {
        subject: `${env.APP_NAME} withdrawal code: ${v.otp ?? ''}`,
        text: `Hi ${v.firstName},\n\nWithdrawal OTP: ${v.otp}\nAmount: ${v.amount}\nWallet: ${v.wallet}\nNetwork: ${v.network}\nID: ${v.withdrawalId}\nExpires in 10 minutes.`,
        html: emailLayout({
          category: 'Security',
          title: 'Confirm your withdrawal',
          preheader: 'One-time code required to authorize this withdrawal',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Use this code to authorize your withdrawal. Never share it with anyone.',
          )}${otpCard(v.otp ?? '------')}${detailRows([
            ['Amount', v.amount ?? '—'],
            ['Wallet', v.wallet ?? '—'],
            ['Network', v.network ?? '—'],
            ['Withdrawal ID', v.withdrawalId ?? '—'],
            ['Expiry', '10 minutes'],
          ])}${highlightCard(
            `<p style="margin:0;color:#F5B942;font-size:13px"><strong>Security warning:</strong> Growzy staff will never ask for this code. If you did not initiate a withdrawal, secure your account now.</p>`,
          )}`,
          ctas: [{ label: 'Secure account', href: secureAccountUrl(), variant: 'secondary' }],
        }),
      }
    case 'deposit-submitted':
      return {
        subject: `Deposit ${v.reference} received`,
        text: `Hi ${v.firstName},\n\nDeposit ${v.reference} for ${v.amount} is pending review.`,
        html: emailLayout({
          category: 'Finance',
          title: 'Deposit submitted',
          preheader: `Deposit ${v.reference} is pending review`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'We received your deposit and it is pending review.',
          )}${statusBadge(v.status ?? 'Pending review', 'warning')}${detailRows([
            ['Deposit ID', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Currency', v.currency ?? 'USD'],
            ['Method', v.method ?? '—'],
            ['Date', v.date ?? ''],
            ['Time', v.time ?? ''],
            ['Status', v.status ?? 'Pending review'],
          ])}`,
          ctas: [{ label: 'View wallet', href: dashboardUrl('/dashboard/wallet') }],
        }),
      }
    case 'deposit-approved':
      return {
        subject: `Deposit ${v.reference} approved`,
        text: `Hi ${v.firstName},\n\nDeposit ${v.reference} approved for ${v.amount}.`,
        html: emailLayout({
          category: 'Finance',
          title: 'Deposit approved',
          preheader: `${v.amount} credited to your wallet`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your deposit was approved and credited to your wallet.',
          )}${statusBadge('Approved', 'success')}${detailRows([
            ['Amount', v.amount ?? ''],
            ['Wallet balance', v.walletBalance ?? '—'],
            ['Transaction ID', v.reference ?? ''],
            ['Approval time', v.approvalTime ?? ''],
          ])}`,
          ctas: [{ label: 'View wallet', href: dashboardUrl('/dashboard/wallet') }],
        }),
      }
    case 'deposit-rejected':
      return {
        subject: `Deposit ${v.reference} rejected`,
        text: `Hi ${v.firstName},\n\nDeposit ${v.reference} rejected. ${v.reason}`,
        html: emailLayout({
          category: 'Finance',
          title: 'Deposit rejected',
          preheader: `Deposit ${v.reference} was not approved`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your deposit could not be approved.',
          )}${statusBadge('Rejected', 'danger')}${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Reason', v.reason ?? ''],
          ])}`,
          ctas: [
            { label: 'Try again', href: dashboardUrl('/dashboard/wallet') },
            { label: 'Contact support', href: dashboardUrl('/dashboard/support'), variant: 'secondary' },
          ],
        }),
      }
    case 'withdrawal-submitted':
      return {
        subject: `Withdrawal ${v.reference} under review`,
        text: `Hi ${v.firstName},\n\nWithdrawal ${v.reference} for ${v.amount} is under review.`,
        html: emailLayout({
          category: 'Finance',
          title: 'Withdrawal requested',
          preheader: `Withdrawal ${v.reference} is under review`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your withdrawal request is under review. Funds remain locked until completed or rejected.',
          )}${statusBadge(v.status ?? 'Under review', 'warning')}${detailRows([
            ['Withdrawal ID', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Wallet', v.wallet ?? '—'],
            ['Network', v.network ?? '—'],
            ['Date', v.date ?? ''],
            ['Time', v.time ?? ''],
            ['Status', v.status ?? 'Under review'],
          ])}`,
          ctas: [{ label: 'View wallet', href: dashboardUrl('/dashboard/wallet') }],
        }),
      }
    case 'withdrawal-approved':
      return {
        subject: `Withdrawal ${v.reference} approved`,
        text: `Hi ${v.firstName},\n\nWithdrawal ${v.reference} approved for ${v.amount}.`,
        html: emailLayout({
          category: 'Finance',
          title: 'Withdrawal approved',
          preheader: `Withdrawal ${v.reference} approved for payout`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your withdrawal was approved and is being processed for payout.',
          )}${statusBadge('Approved', 'success')}${detailRows([
            ['Amount', v.amount ?? ''],
            ['Fee', v.fee ?? '—'],
            ['Net amount', v.netAmount ?? v.amount ?? ''],
            ['Destination wallet', v.destination ?? '—'],
            ['Approval time', v.approvalTime ?? ''],
            ['Reference', v.reference ?? ''],
          ])}`,
          ctas: [{ label: 'View wallet', href: dashboardUrl('/dashboard/wallet') }],
        }),
      }
    case 'withdrawal-rejected':
      return {
        subject: `Withdrawal ${v.reference} rejected`,
        text: `Hi ${v.firstName},\n\nWithdrawal rejected. ${v.reason}`,
        html: emailLayout({
          category: 'Finance',
          title: 'Withdrawal rejected',
          preheader: `Withdrawal ${v.reference} was not approved`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your withdrawal was rejected and locked funds have been released back to your wallet.',
          )}${statusBadge('Rejected', 'danger')}${detailRows([
            ['Reference', v.reference ?? ''],
            ['Amount', v.amount ?? ''],
            ['Date', v.date ?? ''],
            ['Reason', v.reason ?? ''],
          ])}`,
          ctas: [
            { label: 'View wallet', href: dashboardUrl('/dashboard/wallet') },
            { label: 'Contact support', href: dashboardUrl('/dashboard/support'), variant: 'secondary' },
          ],
        }),
      }
    case 'kyc-submitted':
      return {
        subject: 'Identity verification received',
        text: `Hi ${v.firstName},\n\nKYC submitted. Status: Under review. ETA 24–48 hours.`,
        html: emailLayout({
          category: 'KYC',
          title: 'KYC submitted',
          preheader: 'Your documents are under review — typically 24–48 hours',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'We received your identity verification documents. Our compliance team will review them shortly.',
          )}${statusBadge(v.status ?? 'Submitted', 'info')}${detailRows([
            ['Name', v.firstName ?? ''],
            ['Submission ID', v.submissionId ?? '—'],
            ['Submission date', v.submittedAt ?? ''],
            ['Documents', v.documents ?? 'ID · Selfie · Address proof'],
            ['Current status', v.status ?? 'Submitted / Under review'],
            ['Estimated review', v.eta ?? '24–48 hours'],
          ])}${timeline([
            { label: 'Submitted', state: 'done' },
            { label: 'Under review', state: 'current' },
            { label: 'Approved', state: 'upcoming' },
          ])}`,
          ctas: [{ label: 'Check KYC status', href: dashboardUrl('/onboarding') }],
        }),
      }
    case 'kyc-under-review':
      return {
        subject: 'Your KYC is under review',
        text: `Hi ${v.firstName},\n\nCurrent stage: ${v.stage ?? 'Under review'}. ETA: ${v.eta ?? '24–48 hours'}.`,
        html: emailLayout({
          category: 'KYC',
          title: 'KYC under review',
          preheader: 'Compliance review in progress',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your KYC is currently under review. You cannot edit documents until a decision is made.',
          )}${timeline([
            { label: 'Submitted', state: 'done' },
            { label: v.stage ?? 'Under review', state: 'current' },
            { label: 'Decision', state: 'upcoming' },
          ])}${detailRows([
            ['Current stage', v.stage ?? 'Under review'],
            ['Estimated completion', v.eta ?? '24–48 hours'],
          ])}`,
          ctas: [{ label: 'Open dashboard', href: dashboardUrl() }],
        }),
      }
    case 'kyc-approved':
      return {
        subject: 'Your identity verification is approved',
        text: `Hi ${v.firstName},\n\nKYC approved. You can now deposit and invest.`,
        html: emailLayout({
          category: 'KYC',
          title: 'KYC approved',
          preheader: 'Congratulations — you are verified',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            '<strong style="color:#3DDC97">Congratulations.</strong> Your identity verification was approved.',
          )}${highlightCard(
            `<p style="margin:0 0 8px">${statusBadge('Verified', 'success')}</p>
             <p style="margin:0;color:#E8EEF6;font-size:15px;font-weight:700">${escapeHtml(v.verifiedName || v.firstName || 'Investor')}</p>
             <p style="margin:6px 0 0;font-size:12px;color:#8B9BB0">Approved ${escapeHtml(v.approvedAt || 'just now')}</p>`,
          )}`,
          ctas: [
            { label: 'Start investing', href: dashboardUrl('/dashboard/wallet') },
            { label: 'Open dashboard', href: dashboardUrl(), variant: 'secondary' },
          ],
        }),
      }
    case 'kyc-rejected':
      return {
        subject: 'Your identity verification was rejected',
        text: `Hi ${v.firstName},\n\nStatus: REJECTED\nReason: ${v.reason}\n\nUpload again: ${dashboardUrl('/onboarding')}`,
        html: emailLayout({
          category: 'KYC',
          title: 'KYC rejected',
          preheader: 'Action required — please re-upload your documents',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your identity verification was <strong style="color:#FF6B6B">rejected</strong>. Please review the reason and upload corrected documents.',
          )}${statusBadge('REJECTED', 'danger')}${detailRows([
            ['User name', v.firstName ?? ''],
            ['Submission date', v.submittedAt ?? '—'],
            ['Review date', v.reviewedAt ?? '—'],
            ['Rejected by', v.rejectedBy ?? 'Compliance'],
            ['Reason', v.reason ?? ''],
            ['Required corrections', v.corrections ?? v.reason ?? ''],
          ])}`,
          ctas: [
            { label: 'Upload again', href: dashboardUrl('/onboarding') },
            { label: 'Contact support', href: dashboardUrl('/dashboard/support'), variant: 'secondary' },
          ],
        }),
      }
    case 'daily-roi':
      return {
        subject: `Daily ROI report · ${v.date ?? 'Today'} · ${v.returnPct ?? ''}%`,
        text: `Hi ${v.firstName},\n\nReturn: ${v.returnPct}%\nProfit: ${v.profit}\nOpening: ${v.openingBalance}\nClosing: ${v.closingBalance}`,
        html: emailLayout({
          category: 'Investment',
          title: 'Daily investment report',
          preheader: `Today’s return ${v.returnPct ?? '—'}% · Profit ${v.profit ?? '—'}`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your premium daily performance summary is ready.',
          )}${highlightCard(
            `<p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8B9BB0">Today’s return</p>
             <p style="margin:0;font-size:32px;font-weight:800;color:#3DDC97">+${escapeHtml(v.returnPct ?? '0.00')}%</p>
             <p style="margin:8px 0 0;font-size:14px;color:#E8EEF6">Profit ${escapeHtml(v.profit ?? '—')}</p>
             ${miniPerformanceGraph(v.sparkline ?? '')}`,
          )}${detailRows([
            ['Date', v.date ?? ''],
            ['Opening balance', v.openingBalance ?? '—'],
            ['Closing balance', v.closingBalance ?? '—'],
            ['Portfolio value', v.portfolioValue ?? '—'],
            ['Total profit', v.totalProfit ?? '—'],
            ['Investment value', v.investmentValue ?? '—'],
            ['Monthly profit', v.monthlyProfit ?? '—'],
          ])}`,
          ctas: [{ label: 'View dashboard', href: dashboardUrl() }],
        }),
      }
    case 'investment-created':
      return {
        subject: `Investment created · ${v.plan ?? 'Plan'}`,
        text: `Hi ${v.firstName},\n\nPlan: ${v.plan}\nAmount: ${v.amount}\nExpected ROI: ${v.expectedRoi}`,
        html: emailLayout({
          category: 'Investment',
          title: 'Investment created',
          preheader: `${v.plan ?? 'Investment'} · ${v.amount ?? ''}`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your investment position is now active.',
          )}${detailRows([
            ['Plan', v.plan ?? '—'],
            ['Amount', v.amount ?? '—'],
            ['Expected ROI', v.expectedRoi ?? '—'],
            ['Start date', v.startDate ?? '—'],
            ['Maturity date', v.maturityDate ?? '—'],
          ])}`,
          ctas: [{ label: 'View portfolio', href: dashboardUrl() }],
        }),
      }
    case 'investment-completed':
      return {
        subject: 'Investment completed',
        text: `Hi ${v.firstName},\n\nDuration: ${v.duration}\nTotal profit: ${v.totalProfit}\nTotal returned: ${v.totalReturned}`,
        html: emailLayout({
          category: 'Investment',
          title: 'Investment completed',
          preheader: 'Your investment summary is ready',
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Your investment has completed. Here is your summary.',
          )}${statusBadge('Completed', 'success')}${detailRows([
            ['Duration', v.duration ?? '—'],
            ['Total profit', v.totalProfit ?? '—'],
            ['Total returned', v.totalReturned ?? '—'],
          ])}`,
          ctas: [{ label: 'View dashboard', href: dashboardUrl() }],
        }),
      }
    case 'support-reply':
      return {
        subject: `New reply on ticket ${v.reference}`,
        text: `Hi ${v.firstName},\n\n${v.agentName ?? 'Support'} replied to ${v.subject} (${v.reference}):\n\n${v.message}`,
        html: emailLayout({
          category: 'Support',
          title: 'Support replied',
          preheader: `Reply on ticket ${v.reference}`,
          bodyHtml: `${greeting(v.firstName ?? '')}${paragraph(
            'Our team replied to your support ticket.',
          )}${detailRows([
            ['Ticket number', v.reference ?? ''],
            ['Subject', v.subject ?? ''],
            ['Agent', v.agentName ?? 'Growzy Support'],
          ])}${highlightCard(
            `<p style="margin:0;color:#E8EEF6;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(v.message ?? '')}</p>`,
          )}`,
          ctas: [{ label: 'View ticket', href: dashboardUrl('/dashboard/support') }],
        }),
      }
    case 'admin-alert': {
      let fieldPairs: Array<[string, string]> = []
      if (v.fieldsJson) {
        try {
          const parsed = JSON.parse(v.fieldsJson) as Record<string, string>
          fieldPairs = Object.entries(parsed)
        } catch {
          fieldPairs = []
        }
      }
      const link = v.adminLink || `${env.APP_URL.replace(/\/$/, '')}/admin`
      return {
        subject: `[Growzy Alert] ${v.alertTitle}`,
        text: `${v.alertTitle}\n\n${v.alertBody}${v.reference ? `\n\nRef: ${v.reference}` : ''}\n\nAdmin: ${link}`,
        html: emailLayout({
          category: 'System',
          title: v.alertTitle ?? 'Admin alert',
          preheader: 'Internal operations alert',
          bodyHtml: `${
            fieldPairs.length
              ? detailRows(fieldPairs)
              : `${paragraph(`<span style="white-space:pre-wrap">${escapeHtml(v.alertBody ?? '')}</span>`)}${
                  v.reference ? detailRows([['Reference', v.reference]]) : ''
                }`
          }`,
          ctas: [{ label: 'Open admin dashboard', href: link }],
        }),
      }
    }
    case 'broadcast':
    case 'platform-notification':
      return {
        subject: v.title ?? `${env.APP_NAME} update`,
        text: `${v.title}\n\n${v.body}`,
        html: emailLayout({
          category: 'System',
          title: v.title ?? 'Platform update',
          preheader: v.kind ? `${v.kind}: ${v.title}` : v.title,
          bodyHtml: `${v.firstName ? greeting(v.firstName) : ''}${statusBadge(
            v.kind ?? 'Announcement',
            'info',
          )}${paragraph(`<span style="white-space:pre-wrap">${escapeHtml(v.body ?? '')}</span>`)}`,
          ctas: [{ label: 'Open Growzy', href: dashboardUrl() }],
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

/** Category map for sender routing. */
export const TEMPLATE_CATEGORY: Record<Exclude<EmailTemplateName, 'custom'>, import('../sender.js').EmailCategory> = {
  'email-verification': 'Security',
  'password-reset': 'Security',
  welcome: 'Security',
  'security-alert': 'Security',
  'registration-attempt': 'Security',
  'login-otp': 'Security',
  'withdrawal-otp': 'Security',
  'deposit-submitted': 'Finance',
  'deposit-approved': 'Finance',
  'deposit-rejected': 'Finance',
  'withdrawal-submitted': 'Finance',
  'withdrawal-approved': 'Finance',
  'withdrawal-rejected': 'Finance',
  'kyc-submitted': 'KYC',
  'kyc-under-review': 'KYC',
  'kyc-approved': 'KYC',
  'kyc-rejected': 'KYC',
  'daily-roi': 'Investment',
  'investment-created': 'Investment',
  'investment-completed': 'Investment',
  'support-reply': 'Support',
  'admin-alert': 'System',
  broadcast: 'System',
  'platform-notification': 'System',
}

/** All production templates used for QA previews. */
export const PRODUCTION_EMAIL_TEMPLATES: EmailTemplateName[] = [
  'welcome',
  'email-verification',
  'login-otp',
  'withdrawal-otp',
  'password-reset',
  'security-alert',
  'registration-attempt',
  'kyc-submitted',
  'kyc-under-review',
  'kyc-approved',
  'kyc-rejected',
  'deposit-submitted',
  'deposit-approved',
  'deposit-rejected',
  'withdrawal-submitted',
  'withdrawal-approved',
  'withdrawal-rejected',
  'daily-roi',
  'investment-created',
  'investment-completed',
  'support-reply',
  'platform-notification',
  'admin-alert',
  'broadcast',
]
