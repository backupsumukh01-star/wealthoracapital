/**
 * Seed data for DB-managed email templates (admin CMS).
 * Event sends use static responsive templates in `./templates/index.ts`.
 */

import { env } from '../config/env.js'
import { detailRows, emailLayout } from './layout.js'

export type DefaultEmailTemplate = {
  key: string
  name: string
  category: string
  subject: string
  bodyHtml: string
  bodyText: string
  variables: string[]
}

function seedLayout(
  category: 'Security' | 'Finance' | 'Support' | 'KYC' | 'Investment' | 'System',
  title: string,
  body: string,
  ctaLabel?: string,
): string {
  return emailLayout({
    category,
    title,
    bodyHtml: body,
    cta: ctaLabel
      ? { label: ctaLabel, href: `${env.APP_URL.replace(/\/$/, '')}/dashboard` }
      : undefined,
  })
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    key: 'deposit-submitted',
    name: 'Deposit submitted',
    category: 'FINANCE',
    subject: 'Deposit {{reference}} received',
    bodyHtml: seedLayout(
      'Finance',
      'Deposit submitted',
      `<p>Hi {{firstName}},</p><p>We received your deposit and it is pending review.</p>${detailRows([
        ['Reference', '{{reference}}'],
        ['Amount', '{{amount}}'],
      ])}`,
      'View wallet',
    ),
    bodyText: 'Hi {{firstName}},\n\nYour deposit {{reference}} for {{amount}} is pending review.',
    variables: ['firstName', 'reference', 'amount', 'companyName'],
  },
  {
    key: 'deposit-approved',
    name: 'Deposit approved',
    category: 'FINANCE',
    subject: 'Deposit {{reference}} approved',
    bodyHtml: seedLayout(
      'Finance',
      'Deposit approved',
      `<p>Hi {{firstName}},</p><p>Your deposit was approved and credited.</p>${detailRows([
        ['Reference', '{{reference}}'],
        ['Credited', '{{amount}}'],
      ])}`,
      'View wallet',
    ),
    bodyText: 'Hi {{firstName}},\n\nDeposit {{reference}} was approved for {{amount}}.',
    variables: ['firstName', 'reference', 'amount', 'companyName'],
  },
  {
    key: 'deposit-rejected',
    name: 'Deposit rejected',
    category: 'FINANCE',
    subject: 'Deposit {{reference}} rejected',
    bodyHtml: seedLayout(
      'Finance',
      'Deposit rejected',
      `<p>Hi {{firstName}},</p><p>Your deposit could not be approved.</p>${detailRows([
        ['Reference', '{{reference}}'],
        ['Reason', '{{reason}}'],
      ])}`,
      'Try again',
    ),
    bodyText: 'Hi {{firstName}},\n\nDeposit {{reference}} was rejected. {{reason}}',
    variables: ['firstName', 'reference', 'reason', 'companyName'],
  },
  {
    key: 'withdrawal-submitted',
    name: 'Withdrawal submitted',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} under review',
    bodyHtml: seedLayout(
      'Finance',
      'Withdrawal submitted',
      `<p>Hi {{firstName}},</p><p>Your withdrawal is under review.</p>${detailRows([
        ['Reference', '{{reference}}'],
        ['Amount', '{{amount}}'],
      ])}`,
      'View wallet',
    ),
    bodyText: 'Hi {{firstName}},\n\nYour withdrawal {{reference}} for {{amount}} is under review.',
    variables: ['firstName', 'reference', 'amount', 'companyName'],
  },
  {
    key: 'withdrawal-approved',
    name: 'Withdrawal approved',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} approved',
    bodyHtml: seedLayout(
      'Finance',
      'Withdrawal approved',
      `<p>Hi {{firstName}},</p><p>Your withdrawal was approved and is being processed.</p>${detailRows([
        ['Reference', '{{reference}}'],
        ['Amount', '{{amount}}'],
      ])}`,
      'View wallet',
    ),
    bodyText: 'Hi {{firstName}},\n\nWithdrawal {{reference}} was approved.',
    variables: ['firstName', 'reference', 'amount', 'companyName'],
  },
  {
    key: 'withdrawal-rejected',
    name: 'Withdrawal rejected',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} rejected',
    bodyHtml: seedLayout(
      'Finance',
      'Withdrawal rejected',
      `<p>Hi {{firstName}},</p><p>Your withdrawal was rejected and funds released.</p>${detailRows([
        ['Reference', '{{reference}}'],
        ['Reason', '{{reason}}'],
      ])}`,
      'View wallet',
    ),
    bodyText: 'Hi {{firstName}},\n\nWithdrawal {{reference}} was rejected. {{reason}}',
    variables: ['firstName', 'reference', 'reason', 'companyName'],
  },
  {
    key: 'kyc-submitted',
    name: 'KYC submitted',
    category: 'KYC',
    subject: 'Identity verification received',
    bodyHtml: seedLayout(
      'KYC',
      'KYC submitted',
      '<p>Hi {{firstName}},</p><p>We received your identity verification documents.</p>',
      'Check status',
    ),
    bodyText: 'Hi {{firstName}},\n\nYour verification documents are under review.',
    variables: ['firstName', 'companyName'],
  },
  {
    key: 'kyc-approved',
    name: 'KYC approved',
    category: 'KYC',
    subject: 'Your identity verification is approved',
    bodyHtml: seedLayout(
      'KYC',
      'KYC approved',
      '<p>Hi {{firstName}},</p><p>Your identity verification has been approved.</p>',
      'Go to wallet',
    ),
    bodyText: 'Hi {{firstName}},\n\nYour identity verification has been approved.',
    variables: ['firstName', 'companyName'],
  },
  {
    key: 'kyc-rejected',
    name: 'KYC rejected',
    category: 'KYC',
    subject: 'Your identity verification needs attention',
    bodyHtml: seedLayout(
      'KYC',
      'KYC needs attention',
      '<p>Hi {{firstName}},</p><p>{{reason}}</p>',
      'Update KYC',
    ),
    bodyText: 'Hi {{firstName}},\n\n{{reason}}',
    variables: ['firstName', 'reason', 'companyName'],
  },
  {
    key: 'support-ticket-replied',
    name: 'Support ticket reply',
    category: 'SUPPORT',
    subject: 'New reply on ticket {{reference}}',
    bodyHtml: seedLayout(
      'Support',
      'Support replied',
      '<p>Hi {{firstName}},</p><p>{{message}}</p>',
      'Open support',
    ),
    bodyText: 'Hi {{firstName}},\n\n{{message}}',
    variables: ['firstName', 'reference', 'message', 'companyName'],
  },
  {
    key: 'admin-alert',
    name: 'Admin alert',
    category: 'OPS',
    subject: '[Alert] {{alertTitle}}',
    bodyHtml: seedLayout('System', '{{alertTitle}}', '<p>{{alertBody}}</p><p>Ref: {{reference}}</p>', 'Open admin'),
    bodyText: '{{alertTitle}}\n\n{{alertBody}}\n\nRef: {{reference}}',
    variables: ['alertTitle', 'alertBody', 'reference', 'companyName'],
  },
  {
    key: 'broadcast-generic',
    name: 'Broadcast',
    category: 'MARKETING',
    subject: '{{title}}',
    bodyHtml: seedLayout('System', '{{title}}', '<p>{{body}}</p>', 'Open Growzy'),
    bodyText: '{{title}}\n\n{{body}}',
    variables: ['title', 'body', 'companyName'],
  },
]
