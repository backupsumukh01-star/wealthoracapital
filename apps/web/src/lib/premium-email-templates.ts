/**
 * Growzy premium email template system.
 * Each template is a unique responsive HTML layout — table-based for clients.
 * Dark/light compatible via color-scheme + dual-tone palette.
 */

export type PremiumEmailKey =
  | 'welcome'
  | 'verify'
  | 'login_alert'
  | 'password_reset'
  | 'password_changed'
  | 'kyc_started'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'deposit_pending'
  | 'deposit_approved'
  | 'withdrawal_pending'
  | 'withdrawal_approved'
  | 'daily_return'
  | 'weekly_performance'
  | 'monthly_statement'
  | 'trade_published'
  | 'announcement'
  | 'maintenance'
  | 'referral_bonus'
  | 'support_reply'
  | 'account_suspended'
  | 'account_reactivated'
  | 'twofa_enabled'
  | 'email_changed'
  | 'profile_updated'

export type PremiumEmailMeta = {
  key: PremiumEmailKey
  name: string
  subject: string
  category: 'Auth' | 'KYC' | 'Money' | 'Performance' | 'Security' | 'Support' | 'Marketing'
  accent: string
  description: string
}

export const PREMIUM_EMAIL_CATALOG: PremiumEmailMeta[] = [
  { key: 'welcome', name: 'Welcome', subject: 'Welcome to Growzy Capital', category: 'Auth', accent: '#12D6A0', description: 'Onboarding welcome' },
  { key: 'verify', name: 'Verify Email', subject: 'Verify your Growzy email', category: 'Auth', accent: '#2AE8FF', description: 'OTP + verify CTA' },
  { key: 'login_alert', name: 'Login Alert', subject: 'New login to your Growzy account', category: 'Security', accent: '#F59E0B', description: 'Device / location alert' },
  { key: 'password_reset', name: 'Password Reset', subject: 'Reset your Growzy password', category: 'Security', accent: '#6366F1', description: 'Secure reset link' },
  { key: 'password_changed', name: 'Password Changed', subject: 'Your Growzy password was changed', category: 'Security', accent: '#10B981', description: 'Security confirmation' },
  { key: 'kyc_started', name: 'KYC Started', subject: 'KYC submitted — under review', category: 'KYC', accent: '#38BDF8', description: 'Progress timeline' },
  { key: 'kyc_approved', name: 'KYC Approved', subject: 'Account verified — start investing', category: 'KYC', accent: '#12D6A0', description: 'Success celebration' },
  { key: 'kyc_rejected', name: 'KYC Rejected', subject: 'KYC needs your attention', category: 'KYC', accent: '#F97316', description: 'Resubmit documents' },
  { key: 'deposit_pending', name: 'Deposit Request Received', subject: 'Deposit received — awaiting review', category: 'Money', accent: '#22D3EE', description: 'Request timeline' },
  { key: 'deposit_approved', name: 'Deposit Approved', subject: 'Deposit approved — wallet updated', category: 'Money', accent: '#12D6A0', description: 'Balance credited' },
  { key: 'withdrawal_pending', name: 'Withdrawal Requested', subject: 'Withdrawal request received', category: 'Money', accent: '#A78BFA', description: 'Processing estimate' },
  { key: 'withdrawal_approved', name: 'Withdrawal Approved', subject: 'Withdrawal completed', category: 'Money', accent: '#34D399', description: 'Payout confirmation' },
  { key: 'daily_return', name: 'Daily Return Published', subject: 'Today’s return has been credited', category: 'Performance', accent: '#12D6A0', description: 'Performance card' },
  { key: 'weekly_performance', name: 'Weekly Performance', subject: 'Your weekly Growzy performance report', category: 'Performance', accent: '#2AE8FF', description: 'Analytics summary' },
  { key: 'monthly_statement', name: 'Monthly Statement', subject: 'Your Growzy monthly statement', category: 'Performance', accent: '#94A3B8', description: 'Luxury statement' },
  { key: 'trade_published', name: 'Trade Published', subject: 'Today’s trades are live', category: 'Performance', accent: '#F472B6', description: 'Trade tape digest' },
  { key: 'announcement', name: 'Announcement', subject: 'An update from Growzy Capital', category: 'Marketing', accent: '#818CF8', description: 'Marketing banner' },
  { key: 'maintenance', name: 'Maintenance Notice', subject: 'Scheduled maintenance notice', category: 'Support', accent: '#64748B', description: 'Window + reason' },
  { key: 'referral_bonus', name: 'Referral Bonus', subject: 'Referral bonus credited 🎉', category: 'Marketing', accent: '#FBBF24', description: 'Celebration credit' },
  { key: 'support_reply', name: 'Support Ticket Reply', subject: 'New reply on your support ticket', category: 'Support', accent: '#38BDF8', description: 'Conversation thread' },
  { key: 'account_suspended', name: 'Account Suspended', subject: 'Account suspended — compliance notice', category: 'Security', accent: '#EF4444', description: 'Appeal path' },
  { key: 'account_reactivated', name: 'Account Reactivated', subject: 'Welcome back — account reactivated', category: 'Security', accent: '#12D6A0', description: 'Welcome back' },
  { key: 'twofa_enabled', name: '2FA Enabled', subject: 'Two-factor authentication enabled', category: 'Security', accent: '#6366F1', description: 'Security badge' },
  { key: 'email_changed', name: 'Email Changed', subject: 'Your Growzy email was changed', category: 'Security', accent: '#F59E0B', description: 'Old → new email' },
  { key: 'profile_updated', name: 'Profile Updated', subject: 'Your profile was updated', category: 'Auth', accent: '#2DD4BF', description: 'Change summary' },
]

export type EmailSampleData = {
  firstName: string
  userId: string
  username: string
  otp: string
  amount: string
  balance: string
  returnPct: string
  monthlyPct: string
  method: string
  requestId: string
  reference: string
  device: string
  browser: string
  location: string
  time: string
  reason: string
  ticketId: string
  replyPreview: string
  oldEmail: string
  newEmail: string
  changes: string
  maintenanceStart: string
  maintenanceEnd: string
  bonus: string
  ctaUrl: string
  supportEmail: string
}

export const DEFAULT_EMAIL_SAMPLE: EmailSampleData = {
  firstName: 'Ayesha',
  userId: 'GRZ-100001',
  username: '@ayesha',
  otp: '123456',
  amount: '5,000.00',
  balance: '12,480.55',
  returnPct: '0.72',
  monthlyPct: '6.8',
  method: 'USDT · TRC20',
  requestId: 'DEP-88421',
  reference: 'WDR-55201',
  device: 'Windows PC',
  browser: 'Chrome 127',
  location: 'Dubai, AE',
  time: '2 Aug 2026 · 15:42 GST',
  reason: 'Document image was unclear — please re-upload a sharper passport scan.',
  ticketId: 'TKT-1001',
  replyPreview: 'Withdrawals typically land within 1 business day after approval.',
  oldEmail: 'ayesha.old@email.com',
  newEmail: 'ayesha@email.com',
  changes: 'Phone number · Preferred currency',
  maintenanceStart: '3 Aug 2026 · 02:00 GST',
  maintenanceEnd: '3 Aug 2026 · 04:00 GST',
  bonus: '50.00',
  ctaUrl: 'https://growzy.com/dashboard',
  supportEmail: 'support@growzy.com',
}

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function logoMark(accent = '#12D6A0') {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="vertical-align:middle;">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${accent},#2AE8FF);box-shadow:0 8px 24px rgba(18,214,160,0.35);"></div>
      </td>
      <td style="padding-left:12px;vertical-align:middle;">
        <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0B1220;">Growzy</div>
        <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;color:#64748B;letter-spacing:0.08em;text-transform:uppercase;">Capital</div>
      </td>
    </tr>
  </table>`
}

function ctaButton(label: string, href: string, bg: string, text = '#041018') {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:12px;background:${bg};box-shadow:0 10px 30px rgba(0,0,0,0.12);">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${text};text-decoration:none;border-radius:12px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`
}

function securityNote(text: string) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr>
      <td style="padding:14px 16px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;">
        <p style="margin:0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.55;color:#64748B;">
          <strong style="color:#334155;">Security note:</strong> ${escapeHtml(text)}
        </p>
      </td>
    </tr>
  </table>`
}

function socialFooter(supportEmail: string) {
  const link = (label: string, href: string) =>
    `<a href="${href}" style="color:#64748B;text-decoration:none;font-size:12px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;padding:0 8px;">${label}</a>`
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
    <tr>
      <td align="center" style="padding-top:24px;border-top:1px solid #E2E8F0;">
        <p style="margin:0 0 10px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#94A3B8;">
          Need help? <a href="mailto:${supportEmail}" style="color:#0F766E;text-decoration:none;font-weight:600;">${supportEmail}</a>
          · WhatsApp · Telegram
        </p>
        <p style="margin:0 0 14px;">
          ${link('Twitter', 'https://twitter.com/growzy')}
          ${link('LinkedIn', 'https://linkedin.com/company/growzy')}
          ${link('Instagram', 'https://instagram.com/growzy')}
          ${link('Discord', 'https://discord.gg/growzy')}
        </p>
        <p style="margin:0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#94A3B8;">
          © ${new Date().getFullYear()} Growzy Capital. Forex trading involves risk of loss.<br/>
          You’re receiving this because you have a Growzy account.
        </p>
      </td>
    </tr>
  </table>`
}

function shell(opts: {
  accent: string
  preheader: string
  headerBg: string
  headerHtml: string
  bodyHtml: string
  supportEmail: string
  security: string
}) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Growzy</title>
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-bg { background:#07131C !important; }
      .email-card { background:#0F1C28 !important; border-color:#1E3344 !important; }
      .email-title { color:#F1F5F9 !important; }
      .email-text { color:#94A3B8 !important; }
      .email-muted { color:#64748B !important; }
      .email-soft { background:#132433 !important; border-color:#1E3344 !important; }
    }
    @media only screen and (max-width:620px) {
      .email-pad { padding:20px 16px !important; }
      .email-hero { padding:28px 20px !important; }
      .stack { display:block !important; width:100% !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:#F1F5F9;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background:#F1F5F9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;" class="email-card">
          <tr>
            <td class="email-hero" style="padding:28px 32px;border-radius:20px 20px 0 0;background:${opts.headerBg};">
              ${logoMark(opts.accent)}
              ${opts.headerHtml}
            </td>
          </tr>
          <tr>
            <td class="email-pad email-card" style="padding:32px;background:#FFFFFF;border-radius:0 0 20px 20px;border:1px solid #E2E8F0;border-top:0;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
              ${opts.bodyHtml}
              ${securityNote(opts.security)}
              ${socialFooter(opts.supportEmail)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function greeting(firstName: string) {
  return `<p class="email-text" style="margin:0 0 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#475569;">Hi ${escapeHtml(firstName)},</p>`
}

function h1(text: string) {
  return `<h1 class="email-title" style="margin:16px 0 8px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.03em;color:#0B1220;">${escapeHtml(text)}</h1>`
}

function p(text: string) {
  return `<p class="email-text" style="margin:0 0 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#475569;">${text}</p>`
}

function illus(kind: string, accent: string) {
  const icons: Record<string, string> = {
    welcome: `<circle cx="48" cy="48" r="36" fill="${accent}" opacity="0.15"/><path d="M32 52c8 10 24 10 32 0" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="38" cy="40" r="3" fill="${accent}"/><circle cx="58" cy="40" r="3" fill="${accent}"/>`,
    shield: `<path d="M48 18l24 10v18c0 16-10 28-24 32C34 74 24 62 24 46V28l24-10z" fill="${accent}" opacity="0.18"/><path d="M48 28l16 7v12c0 10-6 18-16 21-10-3-16-11-16-21V35l16-7z" fill="${accent}" opacity="0.55"/>`,
    check: `<circle cx="48" cy="48" r="30" fill="${accent}" opacity="0.2"/><path d="M34 49l10 10 18-20" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    warn: `<path d="M48 20l28 48H20L48 20z" fill="${accent}" opacity="0.2"/><rect x="45" y="38" width="6" height="16" rx="2" fill="${accent}"/><circle cx="48" cy="62" r="3" fill="${accent}"/>`,
    money: `<rect x="22" y="30" width="52" height="36" rx="8" fill="${accent}" opacity="0.2"/><text x="48" y="54" text-anchor="middle" font-size="22" font-family="Inter,Arial" fill="${accent}" font-weight="700">$</text>`,
    chart: `<rect x="20" y="56" width="10" height="20" rx="2" fill="${accent}" opacity="0.35"/><rect x="36" y="44" width="10" height="32" rx="2" fill="${accent}" opacity="0.55"/><rect x="52" y="28" width="10" height="48" rx="2" fill="${accent}"/><rect x="68" y="36" width="10" height="40" rx="2" fill="${accent}" opacity="0.7"/>`,
    lock: `<rect x="30" y="42" width="36" height="28" rx="6" fill="${accent}" opacity="0.25"/><path d="M38 42v-6a10 10 0 0120 0v6" stroke="${accent}" stroke-width="3" fill="none"/>`,
    gift: `<rect x="28" y="40" width="40" height="28" rx="4" fill="${accent}" opacity="0.25"/><path d="M48 40v28M28 50h40" stroke="${accent}" stroke-width="3"/><path d="M38 40c0-8 10-8 10 0c0-8 10-8 10 0" stroke="${accent}" stroke-width="3" fill="none"/>`,
    gear: `<circle cx="48" cy="48" r="14" fill="${accent}" opacity="0.25"/><circle cx="48" cy="48" r="6" fill="${accent}"/><path d="M48 22v8M48 66v8M22 48h8M66 48h8M30 30l6 6M60 60l6 6M66 30l-6 6M36 60l-6 6" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`,
    chat: `<rect x="22" y="28" width="52" height="36" rx="10" fill="${accent}" opacity="0.2"/><path d="M34 70l8-10h20" fill="${accent}" opacity="0.2"/><circle cx="38" cy="46" r="3" fill="${accent}"/><circle cx="48" cy="46" r="3" fill="${accent}"/><circle cx="58" cy="46" r="3" fill="${accent}"/>`,
    spark: `<path d="M48 18l6 18h18l-14 12 6 18-16-12-16 12 6-18-14-12h18z" fill="${accent}" opacity="0.45"/>`,
  }
  const path = icons[kind] ?? icons.spark
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:8px 0 4px;">
        <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${path}</svg>
      </td>
    </tr>
  </table>`
}

function kvCard(rows: Array<[string, string]>, border = '#E2E8F0') {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-soft" style="margin:20px 0;border:1px solid ${border};border-radius:14px;overflow:hidden;background:#F8FAFC;">
    ${rows
      .map(
        ([k, v], i) => `
      <tr>
        <td style="padding:12px 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#64748B;border-top:${i === 0 ? '0' : `1px solid ${border}`};">${escapeHtml(k)}</td>
        <td align="right" style="padding:12px 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#0B1220;border-top:${i === 0 ? '0' : `1px solid ${border}`};">${escapeHtml(v)}</td>
      </tr>`,
      )
      .join('')}
  </table>`
}

function timeline(steps: Array<{ label: string; state: 'done' | 'active' | 'todo' }>, accent: string) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    ${steps
      .map((s, i) => {
        const color =
          s.state === 'done' ? accent : s.state === 'active' ? '#0B1220' : '#94A3B8'
        const dot =
          s.state === 'done'
            ? accent
            : s.state === 'active'
              ? '#0B1220'
              : '#CBD5E1'
        return `
      <tr>
        <td width="28" valign="top" style="padding:0 0 16px;">
          <div style="width:12px;height:12px;border-radius:50%;background:${dot};margin-top:4px;box-shadow:0 0 0 4px ${s.state === 'active' ? 'rgba(18,214,160,0.15)' : 'transparent'};"></div>
          ${i < steps.length - 1 ? `<div style="width:2px;height:28px;background:#E2E8F0;margin:4px 0 0 5px;"></div>` : ''}
        </td>
        <td valign="top" style="padding:0 0 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${color};">
          ${escapeHtml(s.label)}
          <div style="font-weight:400;font-size:12px;color:#94A3B8;margin-top:2px;">${s.state === 'done' ? 'Completed' : s.state === 'active' ? 'In progress' : 'Upcoming'}</div>
        </td>
      </tr>`
      })
      .join('')}
  </table>`
}

/* -------------------------------------------------------------------------- */
/* Unique templates                                                           */
/* -------------------------------------------------------------------------- */

function renderWelcome(d: EmailSampleData) {
  const accent = '#12D6A0'
  return shell({
    accent,
    preheader: 'Your Growzy account is ready — verify, complete KYC, then deposit.',
    headerBg: `linear-gradient(135deg,#ECFDF5 0%,#E0F2FE 100%)`,
    headerHtml: `${illus('welcome', accent)}${h1('Welcome aboard')}`,
    supportEmail: d.supportEmail,
    security: 'Growzy will never ask for your password or 2FA codes by email.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p(`Welcome to <strong style="color:#0B1220;">Growzy Capital</strong>. Your permanent User ID is <strong>${escapeHtml(d.userId)}</strong> and username is <strong>${escapeHtml(d.username)}</strong>.`)}
      ${p('Next: verify your email, complete KYC, then fund your wallet when you are ready.')}
      <div style="margin:28px 0;">${ctaButton('Getting Started', d.ctaUrl, accent)}</div>
      <table width="100%" style="margin-top:8px;"><tr>
        <td class="stack" style="padding:10px;border-radius:12px;background:#F0FDFA;text-align:center;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#0F766E;">① Verify email</td>
        <td width="8"></td>
        <td class="stack" style="padding:10px;border-radius:12px;background:#F8FAFC;text-align:center;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#64748B;">② Complete KYC</td>
        <td width="8"></td>
        <td class="stack" style="padding:10px;border-radius:12px;background:#F8FAFC;text-align:center;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#64748B;">③ Deposit</td>
      </tr></table>`,
  })
}

function renderVerify(d: EmailSampleData) {
  const accent = '#2AE8FF'
  return shell({
    accent,
    preheader: `Your verification code is ${d.otp}. Expires in 10 minutes.`,
    headerBg: `linear-gradient(160deg,#ECFEFF 0%,#F0F9FF 100%)`,
    headerHtml: `${illus('shield', accent)}${h1('Verify your email')}`,
    supportEmail: d.supportEmail,
    security: 'If you did not create a Growzy account, you can safely ignore this message.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Confirm your email to unlock onboarding. Use the button below, or enter the one-time code.')}
      <div style="margin:24px 0;">${ctaButton('Verify email', `${d.ctaUrl}/verify`, '#0891B2', '#FFFFFF')}</div>
      <table role="presentation" width="100%" style="margin:24px 0;border-radius:16px;background:#0B1220;">
        <tr><td align="center" style="padding:22px;">
          <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;">One-time code</div>
          <div style="margin-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#2AE8FF;">${escapeHtml(d.otp)}</div>
          <div style="margin-top:10px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#64748B;">⏱ Expires in 10 minutes</div>
        </td></tr>
      </table>`,
  })
}

function renderLoginAlert(d: EmailSampleData) {
  const accent = '#F59E0B'
  return shell({
    accent,
    preheader: `New login from ${d.device} · ${d.location}`,
    headerBg: `linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)`,
    headerHtml: `${illus('lock', accent)}${h1('New login detected')}`,
    supportEmail: d.supportEmail,
    security: 'If this wasn’t you, secure your account immediately and contact support.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('We noticed a sign-in to your Growzy account from a device we don’t usually see.')}
      ${kvCard([
        ['Device', d.device],
        ['Browser', d.browser],
        ['Location', d.location],
        ['Time', d.time],
      ], '#FDE68A')}
      <div style="margin:28px 0;">${ctaButton('Secure account', `${d.ctaUrl}/settings/security`, accent, '#041018')}</div>`,
  })
}

function renderPasswordReset(d: EmailSampleData) {
  const accent = '#6366F1'
  return shell({
    accent,
    preheader: 'Reset your password — link expires in 30 minutes.',
    headerBg: `linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 100%)`,
    headerHtml: `${illus('lock', accent)}${h1('Reset your password')}`,
    supportEmail: d.supportEmail,
    security: 'This link expires in 30 minutes. Growzy staff will never ask you to share it.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('We received a request to reset the password for your Growzy account.')}
      <div style="margin:28px 0;">${ctaButton('Reset password', `${d.ctaUrl}/reset`, accent, '#FFFFFF')}</div>
      <p style="margin:0;text-align:center;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#94A3B8;">Or use code <strong style="color:#4338CA;letter-spacing:0.12em;">${escapeHtml(d.otp)}</strong> · expires in 30 minutes</p>`,
  })
}

function renderPasswordChanged(d: EmailSampleData) {
  const accent = '#10B981'
  return shell({
    accent,
    preheader: 'Your Growzy password was changed successfully.',
    headerBg: `linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)`,
    headerHtml: `${illus('check', accent)}${h1('Password changed')}`,
    supportEmail: d.supportEmail,
    security: 'If you did not make this change, contact support immediately and freeze withdrawals.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your account password was updated successfully. All other sessions remain until you revoke them.')}
      ${kvCard([['When', d.time], ['Device', d.device]])}
      <div style="margin:28px 0;">${ctaButton('Review security', `${d.ctaUrl}/settings/security`, accent)}</div>
      <p style="margin:0;padding:14px 16px;border-radius:12px;background:#FEF2F2;border:1px solid #FECACA;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#991B1B;">
        <strong>If this wasn’t you</strong> — contact ${escapeHtml(d.supportEmail)} immediately.
      </p>`,
  })
}

function renderKycStarted(d: EmailSampleData) {
  const accent = '#38BDF8'
  return shell({
    accent,
    preheader: 'KYC submitted — review typically takes 24–48 hours.',
    headerBg: `linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%)`,
    headerHtml: `${illus('shield', accent)}${h1('KYC under review')}`,
    supportEmail: d.supportEmail,
    security: 'Never send identity documents over chat apps — only upload inside Growzy.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('We received your identity documents. Here’s where you are in the verification journey.')}
      ${timeline(
        [
          { label: 'Step 1 · Documents submitted', state: 'done' },
          { label: 'Step 2 · Compliance review', state: 'active' },
          { label: 'Step 3 · Approval', state: 'todo' },
        ],
        accent,
      )}
      ${p('Expected review window: <strong>24–48 hours</strong>. Deposit stays locked until approval.')}`,
  })
}

function renderKycApproved(d: EmailSampleData) {
  const accent = '#12D6A0'
  return shell({
    accent,
    preheader: 'Account verified — you can deposit and start investing.',
    headerBg: `linear-gradient(160deg,#ECFDF5 0%,#A7F3D0 55%,#ECFEFF 100%)`,
    headerHtml: `${illus('check', accent)}${h1('Account verified')}`,
    supportEmail: d.supportEmail,
    security: 'Only deposit using payment details shown inside your Growzy wallet.',
    bodyHtml: `
      ${greeting(d.firstName)}
      <div style="text-align:center;margin:8px 0 20px;">
        <span style="display:inline-block;padding:8px 16px;border-radius:999px;background:#12D6A0;color:#041018;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;">✓ ACCOUNT VERIFIED</span>
      </div>
      ${p('Congratulations — your KYC is approved. Your dashboard is unlocked for deposits.')}
      <div style="margin:28px 0;">${ctaButton('Start Investing', `${d.ctaUrl}/wallet`, accent)}</div>`,
  })
}

function renderKycRejected(d: EmailSampleData) {
  const accent = '#F97316'
  return shell({
    accent,
    preheader: 'KYC needs attention — please upload clearer documents.',
    headerBg: `linear-gradient(135deg,#FFF7ED 0%,#FFEDD5 100%)`,
    headerHtml: `${illus('warn', accent)}${h1('KYC needs attention')}`,
    supportEmail: d.supportEmail,
    security: 'Only upload documents you own. Fraudulent submissions lead to permanent suspension.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('We could not approve your verification yet. Please review the reason and upload new documents.')}
      <table width="100%" style="margin:16px 0;border-radius:14px;background:#FFF7ED;border:1px solid #FDBA74;">
        <tr><td style="padding:16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#9A3412;">
          <strong>Reason</strong><br/>${escapeHtml(d.reason)}
        </td></tr>
      </table>
      <div style="margin:28px 0;">${ctaButton('Upload New Documents', `${d.ctaUrl}/onboarding`, accent, '#FFFFFF')}</div>`,
  })
}

function renderDepositPending(d: EmailSampleData) {
  const accent = '#22D3EE'
  return shell({
    accent,
    preheader: `Deposit ${d.requestId} received — waiting for review.`,
    headerBg: `linear-gradient(135deg,#ECFEFF 0%,#CFFAFE 100%)`,
    headerHtml: `${illus('money', accent)}${h1('Deposit request received')}`,
    supportEmail: d.supportEmail,
    security: 'Never send funds to addresses shared outside the official Growzy app.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('We received your deposit and queued it for operator review.')}
      ${kvCard([
        ['Request ID', d.requestId],
        ['Amount', `$${d.amount}`],
        ['Payment method', d.method],
        ['Status', 'Waiting for Review'],
      ])}
      ${timeline(
        [
          { label: 'Requested', state: 'done' },
          { label: 'Submitted', state: 'done' },
          { label: 'Review', state: 'active' },
          { label: 'Approved', state: 'todo' },
          { label: 'Wallet updated', state: 'todo' },
        ],
        accent,
      )}`,
  })
}

function renderDepositApproved(d: EmailSampleData) {
  const accent = '#12D6A0'
  return shell({
    accent,
    preheader: `$${d.amount} credited · wallet balance $${d.balance}`,
    headerBg: `linear-gradient(145deg,#ECFDF5 0%,#D1FAE5 50%,#ECFEFF 100%)`,
    headerHtml: `${illus('money', accent)}${h1('Deposit approved')}`,
    supportEmail: d.supportEmail,
    security: 'Confirm the credit inside your wallet ledger before starting new deposits.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your deposit has been approved and credited to your Growzy wallet.')}
      <table width="100%" style="margin:20px 0;border-radius:18px;background:#041018;overflow:hidden;">
        <tr><td align="center" style="padding:28px 20px;">
          <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5EEAD4;">Wallet updated</div>
          <div style="margin-top:8px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:36px;font-weight:700;color:#12D6A0;">+$${escapeHtml(d.amount)}</div>
          <div style="margin-top:6px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#94A3B8;">Current balance · $${escapeHtml(d.balance)}</div>
        </td></tr>
      </table>
      <div style="margin:28px 0;">${ctaButton('View Wallet', `${d.ctaUrl}/wallet`, accent)}</div>`,
  })
}

function renderWithdrawalPending(d: EmailSampleData) {
  const accent = '#A78BFA'
  return shell({
    accent,
    preheader: `Withdrawal ${d.reference} received · estimated processing 24h.`,
    headerBg: `linear-gradient(135deg,#F5F3FF 0%,#EDE9FE 100%)`,
    headerHtml: `${illus('money', accent)}${h1('Withdrawal requested')}`,
    supportEmail: d.supportEmail,
    security: 'Funds are reserved immediately so your available balance cannot be overdrawn.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your withdrawal request is in the compliance queue. Estimated processing time: <strong>up to 24 hours</strong>.')}
      ${kvCard([
        ['Request ID', d.reference],
        ['Amount', `$${d.amount}`],
        ['Destination', d.method],
        ['Est. processing', 'Up to 24 hours'],
      ], '#DDD6FE')}
      ${timeline(
        [
          { label: 'Requested', state: 'done' },
          { label: 'Compliance review', state: 'active' },
          { label: 'Approved', state: 'todo' },
          { label: 'Transferred', state: 'todo' },
        ],
        accent,
      )}`,
  })
}

function renderWithdrawalApproved(d: EmailSampleData) {
  const accent = '#34D399'
  return shell({
    accent,
    preheader: `Withdrawal completed · ref ${d.reference}`,
    headerBg: `linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)`,
    headerHtml: `${illus('check', accent)}${h1('Payment completed')}`,
    supportEmail: d.supportEmail,
    security: 'If funds do not arrive within the expected rail window, reply to this email with the reference.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your withdrawal was approved and the payout has been initiated.')}
      ${kvCard([
        ['Amount', `$${d.amount}`],
        ['Bank / Wallet', d.method],
        ['Reference number', d.reference],
        ['Status', 'Transferred'],
      ])}
      <div style="margin:28px 0;">${ctaButton('View transactions', `${d.ctaUrl}/transactions`, accent)}</div>`,
  })
}

function renderDailyReturn(d: EmailSampleData) {
  const accent = '#12D6A0'
  return shell({
    accent,
    preheader: `Today’s return +${d.returnPct}% credited to your wallet.`,
    headerBg: `linear-gradient(145deg,#042F2E 0%,#0F766E 60%,#134E4A 100%)`,
    headerHtml: `
      <div style="color:#5EEAD4;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-top:18px;">Daily performance</div>
      <h1 style="margin:8px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:28px;color:#ECFDF5;letter-spacing:-0.03em;">Return published</h1>`,
    supportEmail: d.supportEmail,
    security: 'Returns can be positive or negative. Past performance does not guarantee future results.',
    bodyHtml: `
      ${greeting(d.firstName)}
      <table width="100%" style="margin:8px 0 24px;border-radius:18px;border:1px solid #D1FAE5;background:linear-gradient(180deg,#FFFFFF,#F0FDFA);overflow:hidden;">
        <tr>
          <td align="center" style="padding:24px 12px;width:33%;">
            <div style="font-size:11px;color:#64748B;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">TODAY</div>
            <div style="margin-top:6px;font-size:28px;font-weight:700;color:#059669;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">+${escapeHtml(d.returnPct)}%</div>
          </td>
          <td align="center" style="padding:24px 12px;width:33%;border-left:1px solid #D1FAE5;border-right:1px solid #D1FAE5;">
            <div style="font-size:11px;color:#64748B;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">WALLET</div>
            <div style="margin-top:6px;font-size:20px;font-weight:700;color:#0B1220;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">$${escapeHtml(d.balance)}</div>
          </td>
          <td align="center" style="padding:24px 12px;width:33%;">
            <div style="font-size:11px;color:#64748B;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">MONTHLY</div>
            <div style="margin-top:6px;font-size:20px;font-weight:700;color:#0B1220;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">+${escapeHtml(d.monthlyPct)}%</div>
          </td>
        </tr>
      </table>
      <div style="margin:28px 0;">${ctaButton('View Dashboard', d.ctaUrl, accent)}</div>`,
  })
}

function renderWeeklyPerformance(d: EmailSampleData) {
  const accent = '#2AE8FF'
  return shell({
    accent,
    preheader: 'Your weekly Growzy analytics report is ready.',
    headerBg: `linear-gradient(135deg,#0C4A6E 0%,#0369A1 100%)`,
    headerHtml: `
      <div style="color:#7DD3FC;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-top:18px;">Weekly report</div>
      <h1 style="margin:8px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:26px;color:#F0F9FF;">Performance summary</h1>`,
    supportEmail: d.supportEmail,
    security: 'This report is informational. Always reconcile against your in-app ledger.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${illus('chart', accent)}
      ${p('Here’s a concise look at your week with Growzy.')}
      ${kvCard([
        ['Week return', `+${d.returnPct}%`],
        ['Closing wallet', `$${d.balance}`],
        ['Best day', '+1.12%'],
        ['Worst day', '-0.24%'],
        ['Winning days', '5 / 7'],
      ])}
      <table width="100%" style="margin:16px 0;"><tr>
        ${[40, 65, 35, 80, 55, 70, 48]
          .map(
            (h, i) =>
              `<td valign="bottom" align="center" style="padding:0 3px;"><div style="height:${h}px;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#2AE8FF,#0284C7);"></div><div style="font-size:10px;color:#94A3B8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;margin-top:6px;">${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</div></td>`,
          )
          .join('')}
      </tr></table>
      <div style="margin:28px 0;">${ctaButton('Open analytics', `${d.ctaUrl}/my-performance`, '#0284C7', '#FFFFFF')}</div>`,
  })
}

function renderMonthlyStatement(d: EmailSampleData) {
  const accent = '#94A3B8'
  return shell({
    accent,
    preheader: 'Your luxury monthly statement from Growzy Capital.',
    headerBg: `linear-gradient(135deg,#0F172A 0%,#1E293B 100%)`,
    headerHtml: `
      <div style="color:#CBD5E1;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;margin-top:18px;">Monthly statement</div>
      <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;color:#F8FAFC;">August 2026</h1>`,
    supportEmail: d.supportEmail,
    security: 'Statements are final for the period shown. Contact support within 7 days for disputes.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your official Growzy statement for the period is ready.')}
      <table width="100%" style="margin:16px 0;border:1px solid #E2E8F0;border-radius:4px;">
        ${[
          ['Opening balance', '$10,120.00'],
          ['Deposits', `+$${d.amount}`],
          ['Withdrawals', '−$1,200.00'],
          ['Returns', '+$860.55'],
          ['Closing balance', `$${d.balance}`],
        ]
          .map(
            ([k, v], i) => `
          <tr>
            <td style="padding:14px 16px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#475569;border-top:${i ? '1px solid #E2E8F0' : '0'};">${k}</td>
            <td align="right" style="padding:14px 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#0B1220;border-top:${i ? '1px solid #E2E8F0' : '0'};">${v}</td>
          </tr>`,
          )
          .join('')}
      </table>
      <div style="margin:28px 0;">${ctaButton('Download PDF', `${d.ctaUrl}/statements`, '#0F172A', '#FFFFFF')}</div>`,
  })
}

function renderTradePublished(d: EmailSampleData) {
  const accent = '#F472B6'
  return shell({
    accent,
    preheader: 'Today’s desk trades are published on your dashboard.',
    headerBg: `linear-gradient(135deg,#FDF2F8 0%,#FCE7F3 100%)`,
    headerHtml: `${illus('chart', accent)}${h1('Trades published')}`,
    supportEmail: d.supportEmail,
    security: 'Trade tickets are historical records. They do not constitute investment advice.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('The desk closed today’s session. Here’s a snapshot of published tickets.')}
      <table width="100%" style="margin:16px 0;border-collapse:collapse;">
        <tr style="background:#FDF2F8;">
          <th align="left" style="padding:10px;font-size:11px;color:#9D174D;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">PAIR</th>
          <th align="left" style="padding:10px;font-size:11px;color:#9D174D;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">SIDE</th>
          <th align="right" style="padding:10px;font-size:11px;color:#9D174D;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">P/L</th>
        </tr>
        ${[
          ['EUR/USD', 'BUY', '+0.34%'],
          ['GBP/USD', 'SELL', '+0.17%'],
          ['XAU/USD', 'BUY', '+0.52%'],
        ]
          .map(
            ([pair, side, pl]) => `
          <tr>
            <td style="padding:12px 10px;border-top:1px solid #FBCFE8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#0B1220;">${pair}</td>
            <td style="padding:12px 10px;border-top:1px solid #FBCFE8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#64748B;">${side}</td>
            <td align="right" style="padding:12px 10px;border-top:1px solid #FBCFE8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#059669;">${pl}</td>
          </tr>`,
          )
          .join('')}
      </table>
      ${p(`Session net contribution to today’s return: <strong>+${escapeHtml(d.returnPct)}%</strong>`)}
      <div style="margin:28px 0;">${ctaButton('Open Dashboard', d.ctaUrl, accent, '#041018')}</div>`,
  })
}

function renderAnnouncement(d: EmailSampleData) {
  const accent = '#818CF8'
  return shell({
    accent,
    preheader: 'An important update from Growzy Capital.',
    headerBg: `linear-gradient(120deg,#312E81 0%,#4F46E5 50%,#6366F1 100%)`,
    headerHtml: `
      <div style="margin-top:20px;display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.15);color:#E0E7FF;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Announcement</div>
      <h1 style="margin:12px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:28px;color:#FFFFFF;letter-spacing:-0.03em;">Built for clarity</h1>
      <p style="margin:10px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#C7D2FE;max-width:420px;">New performance tools and faster KYC reviews are rolling out this week.</p>`,
    supportEmail: d.supportEmail,
    security: 'Marketing emails can be managed in Preferences. Security alerts cannot be disabled.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('We’re shipping improvements across the investor dashboard — clearer timelines, richer trade detail, and faster support.')}
      <div style="margin:28px 0;">${ctaButton('Explore what’s new', d.ctaUrl, accent, '#FFFFFF')}</div>`,
  })
}

function renderMaintenance(d: EmailSampleData) {
  const accent = '#64748B'
  return shell({
    accent,
    preheader: `Maintenance ${d.maintenanceStart} → ${d.maintenanceEnd}`,
    headerBg: `linear-gradient(135deg,#F8FAFC 0%,#E2E8F0 100%)`,
    headerHtml: `${illus('gear', accent)}${h1('Scheduled maintenance')}`,
    supportEmail: d.supportEmail,
    security: 'During maintenance, deposits and withdrawals may be temporarily unavailable.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Growzy will undergo scheduled maintenance. Trading ledgers remain safe; some actions will pause.')}
      ${kvCard([
        ['Start time', d.maintenanceStart],
        ['End time', d.maintenanceEnd],
        ['Reason', 'Infrastructure upgrade & ledger reconciliation'],
      ])}
      ${p('We will notify you when services are fully restored.')}`,
  })
}

function renderReferralBonus(d: EmailSampleData) {
  const accent = '#FBBF24'
  return shell({
    accent,
    preheader: `$${d.bonus} referral bonus credited to your wallet.`,
    headerBg: `linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 40%,#FDE68A 100%)`,
    headerHtml: `${illus('gift', accent)}${h1('Bonus credited!')}`,
    supportEmail: d.supportEmail,
    security: 'Referral abuse or self-referrals may reverse bonuses and restrict accounts.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Celebration time — a friend joined Growzy with your invite.')}
      <table width="100%" style="margin:16px 0;border-radius:18px;background:#0B1220;">
        <tr><td align="center" style="padding:26px;">
          <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#FCD34D;letter-spacing:0.12em;text-transform:uppercase;">Referral bonus</div>
          <div style="margin-top:8px;font-size:36px;font-weight:700;color:#FBBF24;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">+$${escapeHtml(d.bonus)}</div>
        </td></tr>
      </table>
      <div style="margin:28px 0;">${ctaButton('Invite friends', `${d.ctaUrl}/referrals`, accent)}</div>`,
  })
}

function renderSupportReply(d: EmailSampleData) {
  const accent = '#38BDF8'
  return shell({
    accent,
    preheader: `New reply on ticket ${d.ticketId}`,
    headerBg: `linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%)`,
    headerHtml: `${illus('chat', accent)}${h1('Support replied')}`,
    supportEmail: d.supportEmail,
    security: 'Support will never ask for passwords, seed phrases, or 2FA codes.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p(`There’s a new message on ticket <strong>${escapeHtml(d.ticketId)}</strong>.`)}
      <table width="100%" style="margin:16px 0;border-radius:16px;border:1px solid #BAE6FD;background:#F0F9FF;">
        <tr><td style="padding:16px;">
          <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;color:#0284C7;font-weight:600;">GROWZY SUPPORT</div>
          <p style="margin:8px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#0C4A6E;">${escapeHtml(d.replyPreview)}</p>
        </td></tr>
      </table>
      <div style="margin:28px 0;">${ctaButton('Reply to ticket', `${d.ctaUrl}/support`, '#0284C7', '#FFFFFF')}</div>`,
  })
}

function renderAccountSuspended(d: EmailSampleData) {
  const accent = '#EF4444'
  return shell({
    accent,
    preheader: 'Your Growzy account has been suspended — compliance notice.',
    headerBg: `linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%)`,
    headerHtml: `${illus('warn', accent)}${h1('Account suspended')}`,
    supportEmail: d.supportEmail,
    security: 'Appeals are reviewed by compliance. Do not create duplicate accounts.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your account has been suspended pending compliance review. Deposits, withdrawals, and trading access are paused.')}
      <table width="100%" style="margin:16px 0;border-radius:14px;background:#FEF2F2;border:1px solid #FECACA;">
        <tr><td style="padding:16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#991B1B;">
          <strong>Reason</strong><br/>${escapeHtml(d.reason)}
        </td></tr>
      </table>
      <div style="margin:28px 0;">${ctaButton('Submit appeal', `${d.ctaUrl}/support`, accent, '#FFFFFF')}</div>`,
  })
}

function renderAccountReactivated(d: EmailSampleData) {
  const accent = '#12D6A0'
  return shell({
    accent,
    preheader: 'Welcome back — your Growzy account is active again.',
    headerBg: `linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)`,
    headerHtml: `${illus('spark', accent)}${h1('Welcome back')}`,
    supportEmail: d.supportEmail,
    security: 'Review your security settings after reactivation, especially if a password reset occurred.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Good news — your account has been reactivated. You can continue investing with full access restored.')}
      <div style="margin:28px 0;">${ctaButton('Continue Investing', d.ctaUrl, accent)}</div>`,
  })
}

function renderTwoFaEnabled(d: EmailSampleData) {
  const accent = '#6366F1'
  return shell({
    accent,
    preheader: 'Authenticator app protection is now active on your account.',
    headerBg: `linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 100%)`,
    headerHtml: `${illus('shield', accent)}${h1('2FA enabled')}`,
    supportEmail: d.supportEmail,
    security: 'Store backup codes offline. Losing both device and codes may delay account recovery.',
    bodyHtml: `
      ${greeting(d.firstName)}
      <div style="text-align:center;margin:12px 0 20px;">
        <span style="display:inline-block;padding:10px 18px;border-radius:999px;border:1px solid #C7D2FE;background:#FFFFFF;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#4338CA;">🛡 AUTHENTICATOR ACTIVATED</span>
      </div>
      ${p('Two-factor authentication is now protecting sign-ins to your Growzy account.')}
      ${kvCard([['Enabled at', d.time], ['Device', d.device]])}
      <div style="margin:28px 0;">${ctaButton('View security settings', `${d.ctaUrl}/settings/security`, accent, '#FFFFFF')}</div>`,
  })
}

function renderEmailChanged(d: EmailSampleData) {
  const accent = '#F59E0B'
  return shell({
    accent,
    preheader: `Email changed from ${d.oldEmail} to ${d.newEmail}`,
    headerBg: `linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)`,
    headerHtml: `${illus('lock', accent)}${h1('Email address updated')}`,
    supportEmail: d.supportEmail,
    security: 'If you did not request this change, contact support immediately from a trusted device.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('The email on your Growzy account was changed.')}
      ${kvCard([
        ['Old email', d.oldEmail],
        ['New email', d.newEmail],
        ['When', d.time],
      ], '#FDE68A')}
      <p style="margin:0;padding:14px 16px;border-radius:12px;background:#FEF2F2;border:1px solid #FECACA;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#991B1B;">
        <strong>If this wasn’t you</strong> — contact ${escapeHtml(d.supportEmail)} immediately.
      </p>`,
  })
}

function renderProfileUpdated(d: EmailSampleData) {
  const accent = '#2DD4BF'
  return shell({
    accent,
    preheader: 'Your Growzy profile was updated successfully.',
    headerBg: `linear-gradient(135deg,#F0FDFA 0%,#CCFBF1 100%)`,
    headerHtml: `${illus('check', accent)}${h1('Profile updated')}`,
    supportEmail: d.supportEmail,
    security: 'Review the change summary. Unexpected edits may indicate account compromise.',
    bodyHtml: `
      ${greeting(d.firstName)}
      ${p('Your profile was updated successfully. Here’s a summary of what changed.')}
      ${kvCard([
        ['Changes', d.changes],
        ['Updated at', d.time],
      ])}
      <div style="margin:28px 0;">${ctaButton('View profile', `${d.ctaUrl}/settings/profile`, accent)}</div>`,
  })
}

const RENDERERS: Record<PremiumEmailKey, (d: EmailSampleData) => string> = {
  welcome: renderWelcome,
  verify: renderVerify,
  login_alert: renderLoginAlert,
  password_reset: renderPasswordReset,
  password_changed: renderPasswordChanged,
  kyc_started: renderKycStarted,
  kyc_approved: renderKycApproved,
  kyc_rejected: renderKycRejected,
  deposit_pending: renderDepositPending,
  deposit_approved: renderDepositApproved,
  withdrawal_pending: renderWithdrawalPending,
  withdrawal_approved: renderWithdrawalApproved,
  daily_return: renderDailyReturn,
  weekly_performance: renderWeeklyPerformance,
  monthly_statement: renderMonthlyStatement,
  trade_published: renderTradePublished,
  announcement: renderAnnouncement,
  maintenance: renderMaintenance,
  referral_bonus: renderReferralBonus,
  support_reply: renderSupportReply,
  account_suspended: renderAccountSuspended,
  account_reactivated: renderAccountReactivated,
  twofa_enabled: renderTwoFaEnabled,
  email_changed: renderEmailChanged,
  profile_updated: renderProfileUpdated,
}

export function renderPremiumEmail(
  key: PremiumEmailKey,
  data: Partial<EmailSampleData> = {},
): string {
  const merged = { ...DEFAULT_EMAIL_SAMPLE, ...data }
  return RENDERERS[key](merged)
}

export function getPremiumEmailMeta(key: PremiumEmailKey) {
  return PREMIUM_EMAIL_CATALOG.find((t) => t.key === key)!
}

/** Seed Admin OS emailTemplates from the premium catalog. */
export function buildPremiumEmailTemplateSeed() {
  return PREMIUM_EMAIL_CATALOG.map((meta) => ({
    id: `EM_${meta.key}`,
    key: meta.key,
    name: meta.name,
    subject: meta.subject,
    bodyHtml: renderPremiumEmail(meta.key),
    updatedAt: new Date().toISOString(),
  }))
}
