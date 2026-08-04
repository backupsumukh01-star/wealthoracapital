/**
 * Seed data for DB-managed email templates (Phase 6). These are the editable, versioned
 * counterparts to the static templates in `./templates/index.ts` — the static templates keep
 * working for auth flows; these seed the CMS-style template library admins can edit.
 */

export type DefaultEmailTemplate = {
  key: string
  name: string
  category: string
  subject: string
  bodyHtml: string
  bodyText: string
  variables: string[]
}

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <h1 style="font-size:20px">${title}</h1>
    ${body}
    <p style="color:#666;font-size:12px">— {{companyName}}</p>
  </body>
</html>`
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    key: 'welcome',
    name: 'Welcome',
    category: 'ONBOARDING',
    subject: 'Welcome to {{companyName}}',
    bodyHtml: wrap('Welcome', '<p>Hi {{firstName}},</p><p>Your email is verified. Welcome aboard.</p>'),
    bodyText: 'Hi {{firstName}},\n\nYour email is verified. Welcome aboard.',
    variables: ['firstName', 'companyName'],
  },
  {
    key: 'register',
    name: 'Registration attempt',
    category: 'ONBOARDING',
    subject: 'Registration attempt on your {{companyName}} account',
    bodyHtml: wrap(
      'Registration attempt',
      '<p>Hi {{firstName}},</p><p>Someone tried to register using your email. If this was you, sign in or reset your password.</p>',
    ),
    bodyText: 'Hi {{firstName}},\n\nSomeone tried to register using your email.',
    variables: ['firstName', 'companyName'],
  },
  {
    key: 'verify-email',
    name: 'Verify email',
    category: 'ONBOARDING',
    subject: 'Verify your {{companyName}} email',
    bodyHtml: wrap(
      'Verify your email',
      '<p>Hi {{firstName}},</p><p><a href="{{verifyUrl}}">Verify email</a></p><p>This link expires in 24 hours.</p>',
    ),
    bodyText: 'Hi {{firstName}},\n\nVerify your email: {{verifyUrl}}',
    variables: ['firstName', 'verifyUrl', 'companyName'],
  },
  {
    key: 'forgot-password',
    name: 'Forgot password',
    category: 'SECURITY',
    subject: 'Reset your {{companyName}} password',
    bodyHtml: wrap(
      'Reset your password',
      '<p>Hi {{firstName}},</p><p><a href="{{resetUrl}}">Reset password</a></p><p>This link expires in 1 hour.</p>',
    ),
    bodyText: 'Hi {{firstName}},\n\nReset your password: {{resetUrl}}',
    variables: ['firstName', 'resetUrl', 'companyName'],
  },
  {
    key: 'security-alert',
    name: 'Security alert',
    category: 'SECURITY',
    subject: '{{companyName}} security alert',
    bodyHtml: wrap('Security alert', '<p>Hi {{firstName}},</p><p>{{message}}</p>'),
    bodyText: 'Hi {{firstName}},\n\n{{message}}',
    variables: ['firstName', 'message', 'companyName'],
  },
  {
    key: 'deposit-submitted',
    name: 'Deposit submitted',
    category: 'FINANCE',
    subject: 'Deposit {{reference}} received',
    bodyHtml: wrap('Deposit submitted', '<p>Your deposit {{reference}} for {{amount}} is pending review.</p>'),
    bodyText: 'Your deposit {{reference}} for {{amount}} is pending review.',
    variables: ['reference', 'amount', 'companyName'],
  },
  {
    key: 'deposit-approved',
    name: 'Deposit approved',
    category: 'FINANCE',
    subject: 'Deposit {{reference}} approved',
    bodyHtml: wrap('Deposit approved', '<p>Deposit {{reference}} was approved for {{amount}}.</p>'),
    bodyText: 'Deposit {{reference}} was approved for {{amount}}.',
    variables: ['reference', 'amount', 'companyName'],
  },
  {
    key: 'deposit-rejected',
    name: 'Deposit rejected',
    category: 'FINANCE',
    subject: 'Deposit {{reference}} rejected',
    bodyHtml: wrap('Deposit rejected', '<p>Deposit {{reference}} was rejected. {{reason}}</p>'),
    bodyText: 'Deposit {{reference}} was rejected. {{reason}}',
    variables: ['reference', 'reason', 'companyName'],
  },
  {
    key: 'withdrawal-submitted',
    name: 'Withdrawal submitted',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} under review',
    bodyHtml: wrap('Withdrawal submitted', '<p>Your withdrawal {{reference}} for {{amount}} is under review.</p>'),
    bodyText: 'Your withdrawal {{reference}} for {{amount}} is under review.',
    variables: ['reference', 'amount', 'companyName'],
  },
  {
    key: 'withdrawal-approved',
    name: 'Withdrawal approved',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} approved',
    bodyHtml: wrap('Withdrawal approved', '<p>Withdrawal {{reference}} was approved and will be processed.</p>'),
    bodyText: 'Withdrawal {{reference}} was approved and will be processed.',
    variables: ['reference', 'companyName'],
  },
  {
    key: 'withdrawal-paid',
    name: 'Withdrawal paid',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} paid',
    bodyHtml: wrap('Withdrawal paid', '<p>Withdrawal {{reference}} has been paid.</p>'),
    bodyText: 'Withdrawal {{reference}} has been paid.',
    variables: ['reference', 'companyName'],
  },
  {
    key: 'withdrawal-rejected',
    name: 'Withdrawal rejected',
    category: 'FINANCE',
    subject: 'Withdrawal {{reference}} rejected',
    bodyHtml: wrap('Withdrawal rejected', '<p>Withdrawal {{reference}} was rejected. {{reason}}</p>'),
    bodyText: 'Withdrawal {{reference}} was rejected. {{reason}}',
    variables: ['reference', 'reason', 'companyName'],
  },
  {
    key: 'kyc-approved',
    name: 'KYC approved',
    category: 'KYC',
    subject: 'Your identity verification is approved',
    bodyHtml: wrap('KYC approved', '<p>Hi {{firstName}},</p><p>Your identity verification has been approved.</p>'),
    bodyText: 'Hi {{firstName}},\n\nYour identity verification has been approved.',
    variables: ['firstName', 'companyName'],
  },
  {
    key: 'kyc-rejected',
    name: 'KYC rejected',
    category: 'KYC',
    subject: 'Your identity verification needs attention',
    bodyHtml: wrap('KYC rejected', '<p>Hi {{firstName}},</p><p>{{reason}}</p>'),
    bodyText: 'Hi {{firstName}},\n\n{{reason}}',
    variables: ['firstName', 'reason', 'companyName'],
  },
  {
    key: 'kyc-info-requested',
    name: 'KYC info requested',
    category: 'KYC',
    subject: 'More information needed for your verification',
    bodyHtml: wrap('More information needed', '<p>Hi {{firstName}},</p><p>{{message}}</p>'),
    bodyText: 'Hi {{firstName}},\n\n{{message}}',
    variables: ['firstName', 'message', 'companyName'],
  },
  {
    key: 'support-ticket-created',
    name: 'Support ticket created',
    category: 'SUPPORT',
    subject: 'We received your ticket {{reference}}',
    bodyHtml: wrap('Ticket received', '<p>Hi {{firstName}},</p><p>Your ticket "{{subject}}" ({{reference}}) was received. We usually reply within one business day.</p>'),
    bodyText: 'Hi {{firstName}},\n\nYour ticket "{{subject}}" ({{reference}}) was received.',
    variables: ['firstName', 'reference', 'subject', 'companyName'],
  },
  {
    key: 'support-ticket-replied',
    name: 'Support ticket reply',
    category: 'SUPPORT',
    subject: 'New reply on ticket {{reference}}',
    bodyHtml: wrap('New reply', '<p>Hi {{firstName}},</p><p>{{message}}</p>'),
    bodyText: 'Hi {{firstName}},\n\n{{message}}',
    variables: ['firstName', 'reference', 'message', 'companyName'],
  },
  {
    key: 'daily-profit',
    name: 'Daily profit',
    category: 'TRADING',
    subject: "Today's return: {{returnPct}}%",
    bodyHtml: wrap('Daily profit', "<p>Today's return: {{returnPct}}% · {{amount}}</p>"),
    bodyText: "Today's return: {{returnPct}}% · {{amount}}",
    variables: ['returnPct', 'amount', 'companyName'],
  },
  {
    key: 'broadcast-generic',
    name: 'Broadcast (generic)',
    category: 'MARKETING',
    subject: '{{subject}}',
    bodyHtml: wrap('{{title}}', '<p>{{body}}</p>'),
    bodyText: '{{title}}\n\n{{body}}',
    variables: ['subject', 'title', 'body', 'companyName'],
  },
]
