import { env } from '../config/env.js'
import { type EmailCategory, senderForCategory } from './sender.js'

/** Premium institutional email chrome — dark luxury, table-based for Outlook / Gmail / Apple Mail. */

export type EmailCta = { label: string; href: string; variant?: 'primary' | 'secondary' | 'danger' }

export type TimelineStep = {
  label: string
  state: 'done' | 'current' | 'upcoming'
}

const COLORS = {
  bg: '#07090B',
  card: '#0D1115',
  cardAlt: '#11161B',
  border: '#202A33',
  text: '#F2F4F7',
  muted: '#C4CBD3',
  subtle: '#89939E',
  accent: '#D4D9DF',
  accentDim: '#202A33',
  success: '#3CCB91',
  warning: '#D9A441',
  danger: '#E05C67',
  white: '#FFFFFF',
  otpBg: '#0A0D10',
  gold: '#C9A45C',
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function supportUrl(): string {
  return `${env.APP_URL.replace(/\/$/, '')}/dashboard/support`
}

function siteUrl(): string {
  return env.APP_URL.replace(/\/$/, '') || 'https://wealthoracapital.com'
}

const CONTACT_EMAIL = 'update@wealthoracapital.net'

function siteHost(): string {
  try {
    return new URL(siteUrl()).hostname.replace(/^www\./, '')
  } catch {
    return 'wealthoracapital.com'
  }
}

function badgeHtml(category: EmailCategory): string {
  const tones: Record<EmailCategory, { bg: string; fg: string }> = {
    Security: { bg: '#2A1215', fg: COLORS.danger },
    Finance: { bg: '#0E2A24', fg: COLORS.success },
    Support: { bg: '#11161B', fg: COLORS.accent },
    KYC: { bg: '#151A20', fg: '#AAB3BD' },
    Investment: { bg: '#1F1A0A', fg: COLORS.gold },
    System: { bg: '#1A1F28', fg: COLORS.muted },
  }
  const t = tones[category]
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${t.bg};color:${t.fg};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border:1px solid ${t.fg}33">${escapeHtml(category)}</span>`
}

export function statusBadge(
  label: string,
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'info',
): string {
  const map = {
    success: { bg: '#0E2A24', fg: COLORS.success },
    warning: { bg: '#2A210E', fg: COLORS.warning },
    danger: { bg: '#2A1215', fg: COLORS.danger },
    info: { bg: '#11161B', fg: COLORS.accent },
    neutral: { bg: '#1A1F28', fg: COLORS.muted },
  }[tone]
  return `<span style="display:inline-block;padding:5px 12px;border-radius:8px;background:${map.bg};color:${map.fg};font-size:12px;font-weight:700;letter-spacing:0.04em">${escapeHtml(label)}</span>`
}

export function detailRows(rows: Array<[string, string]>): string {
  const cells = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(
      ([label, value], i, arr) => `<tr>
      <td style="padding:12px 0;border-bottom:${i === arr.length - 1 ? '0' : `1px solid ${COLORS.border}`};color:${COLORS.muted};font-size:13px;width:42%;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:12px 0;border-bottom:${i === arr.length - 1 ? '0' : `1px solid ${COLORS.border}`};color:${COLORS.text};font-size:13px;font-weight:600;text-align:right;vertical-align:top;word-break:break-word">${escapeHtml(value)}</td>
    </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;border-collapse:collapse;background:${COLORS.cardAlt};border-radius:12px;border:1px solid ${COLORS.border}">
    <tr><td style="padding:4px 18px">${cells ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${cells}</table>` : ''}</td></tr>
  </table>`
}

export function otpCard(code: string, expiresLabel = 'Expires in 10 minutes'): string {
  const digits = escapeHtml(code.replace(/\s/g, ''))
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse">
    <tr>
      <td align="center" style="padding:28px 20px;background:linear-gradient(180deg,${COLORS.otpBg} 0%,${COLORS.cardAlt} 100%);border:1px solid ${COLORS.accentDim};border-radius:16px">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.muted};font-weight:700">One-time code</p>
        <p style="margin:0;font-size:36px;line-height:1.2;letter-spacing:0.28em;font-weight:800;color:${COLORS.white};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${digits}</p>
        <p style="margin:14px 0 0;font-size:13px;color:${COLORS.warning}">${escapeHtml(expiresLabel)}</p>
      </td>
    </tr>
  </table>`
}

export function timeline(steps: TimelineStep[]): string {
  const rows = steps
    .map((step, i) => {
      const done = step.state === 'done'
      const current = step.state === 'current'
      const dot = done ? COLORS.success : current ? COLORS.accent : COLORS.subtle
      const labelColor = current ? COLORS.white : done ? COLORS.text : COLORS.subtle
      const weight = current ? 700 : 500
      const connector =
        i < steps.length - 1
          ? `<tr><td align="center" style="height:18px;line-height:18px;font-size:0;padding:0"><div style="width:2px;height:18px;background:${COLORS.border};margin:0 auto"></div></td><td></td></tr>`
          : ''
      return `<tr>
        <td width="28" align="center" valign="middle" style="padding:4px 0">
          <div style="width:12px;height:12px;border-radius:50%;background:${dot};border:2px solid ${dot};box-shadow:${current ? `0 0 0 4px ${COLORS.accentDim}` : 'none'}"></div>
        </td>
        <td style="padding:6px 0 6px 12px;color:${labelColor};font-size:14px;font-weight:${weight}">${escapeHtml(step.label)}${current ? ' <span style="color:' + COLORS.accent + ';font-size:11px;font-weight:700">· CURRENT</span>' : ''}</td>
      </tr>${connector}`
    })
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;padding:16px 18px;background:${COLORS.cardAlt};border-radius:12px;border:1px solid ${COLORS.border}">
    ${rows}
  </table>`
}

function renderCtas(ctas: EmailCta[]): string {
  if (!ctas.length) return ''
  const buttons = ctas
    .map((cta) => {
      const variant = cta.variant ?? 'primary'
      const styles =
        variant === 'secondary'
          ? `background:transparent;color:${COLORS.text};border:1px solid ${COLORS.border}`
          : variant === 'danger'
            ? `background:${COLORS.danger};color:${COLORS.white};border:1px solid ${COLORS.danger}`
            : `background:${COLORS.accent};color:#07090B;border:1px solid ${COLORS.accent}`
      return `<a href="${escapeAttr(cta.href)}"
        style="display:inline-block;${styles};font-size:14px;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:10px;margin:0 8px 10px 0">
        ${escapeHtml(cta.label)}
      </a>`
    })
    .join('')
  return `<tr><td class="px" style="padding:8px 32px 8px">${buttons}</td></tr>`
}

/**
 * Shared responsive email shell — dark luxury Wealthora branding.
 */
export function emailLayout(input: {
  category: EmailCategory
  title: string
  preheader?: string
  bodyHtml: string
  ctas?: EmailCta[]
  /** @deprecated prefer ctas[] */
  cta?: EmailCta
}): string {
  const brand = env.APP_NAME || 'Wealthora Capital'
  const year = new Date().getFullYear()
  const preheader = input.preheader ?? input.title
  const ctas = input.ctas ?? (input.cta ? [input.cta] : [])
  const sender = senderForCategory(input.category)

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(input.title)}</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,Helvetica,sans-serif !important}</style>
  <![endif]-->
  <style>
    :root { color-scheme: dark light; }
    @media only screen and (max-width:620px) {
      .container { width:100% !important; max-width:100% !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
      .stack { display:block !important; width:100% !important; }
    }
    @media (prefers-color-scheme: light) {
      .outer-bg { background:#EEF2F6 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;</div>
  <table role="presentation" class="outer-bg" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bg};padding:28px 12px">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" style="width:560px;max-width:560px;background:${COLORS.card};border-radius:20px;overflow:hidden;border:1px solid ${COLORS.border};box-shadow:0 24px 64px rgba(0,0,0,0.45)">
          <!-- Header -->
          <tr>
            <td class="px" style="padding:28px 32px 20px;background:linear-gradient(145deg,#07090B 0%,#0D1115 55%,#0A0D10 100%);border-bottom:1px solid ${COLORS.border}">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px">
                          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${COLORS.accent},${COLORS.gold});text-align:center;line-height:36px;font-weight:800;color:#07090B;font-size:16px">W</div>
                        </td>
                        <td valign="middle">
                          <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:0.02em;color:${COLORS.white}">${escapeHtml(brand)}</p>
                          <p style="margin:2px 0 0;font-size:11px;color:${COLORS.subtle};letter-spacing:0.08em;text-transform:uppercase">Institutional platform</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">${badgeHtml(input.category)}</td>
                </tr>
              </table>
              <h1 style="margin:22px 0 0;font-size:24px;line-height:1.3;color:${COLORS.white};font-weight:750">${escapeHtml(input.title)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="px" style="padding:28px 32px 12px;font-size:15px;line-height:1.65;color:${COLORS.muted}">
              ${input.bodyHtml}
            </td>
          </tr>
          ${renderCtas(ctas)}
          <!-- Footer -->
          <tr>
            <td class="px" style="padding:24px 32px 28px;border-top:1px solid ${COLORS.border};background:#0B1016">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${COLORS.text}">${escapeHtml(brand)}</p>
              <p style="margin:0 0 4px;font-size:12px;color:${COLORS.subtle}">
                <a href="mailto:${CONTACT_EMAIL}" style="color:${COLORS.accent};text-decoration:none">${CONTACT_EMAIL}</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(siteUrl())}" style="color:${COLORS.accent};text-decoration:none">${escapeHtml(siteHost())}</a>
              </p>
              <p style="margin:14px 0 6px;font-size:12px;color:${COLORS.muted}">
                Need help? <a href="${escapeAttr(supportUrl())}" style="color:${COLORS.accent};text-decoration:none;font-weight:600">Contact Support</a>
              </p>
              <p style="margin:12px 0 0;padding:12px 14px;border-radius:10px;background:${COLORS.cardAlt};border:1px solid ${COLORS.border};font-size:12px;line-height:1.5;color:${COLORS.subtle}">
                <strong style="color:${COLORS.warning}">Security notice:</strong> Wealthora will never ask for your password or OTP.
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:${COLORS.subtle}">© ${year} ${escapeHtml(brand)}. All rights reserved. Sent from ${escapeHtml(sender.email)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function greeting(firstName: string): string {
  return `<p style="margin:0 0 14px;color:${COLORS.text};font-size:15px">Hi ${escapeHtml(firstName || 'there')},</p>`
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;color:${COLORS.muted};font-size:15px;line-height:1.65">${text}</p>`
}

export function highlightCard(html: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0 16px"><tr>
    <td style="padding:18px;background:${COLORS.cardAlt};border-radius:14px;border:1px solid ${COLORS.border}">${html}</td>
  </tr></table>`
}

export { COLORS }
