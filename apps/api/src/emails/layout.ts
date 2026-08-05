import { env } from '../config/env.js'

/** Shared responsive email chrome — table-based for Outlook + mobile clients. */
export function emailLayout(input: {
  preheader?: string
  title: string
  bodyHtml: string
  cta?: { label: string; href: string }
}): string {
  const brand = env.APP_NAME
  const year = new Date().getFullYear()
  const preheader = input.preheader ?? input.title
  const cta = input.cta
    ? `<tr>
        <td style="padding:8px 0 24px">
          <a href="${escapeAttr(input.cta.href)}"
             style="display:inline-block;background:#0B6E4F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px">
            ${escapeHtml(input.cta.label)}
          </a>
        </td>
      </tr>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    @media only screen and (max-width:620px) {
      .container { width:100% !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F3F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F5F7;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
          <tr>
            <td class="px" style="padding:28px 32px 12px;background:linear-gradient(135deg,#06281F 0%,#0B6E4F 100%)">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#A7F3D0;font-weight:600">${escapeHtml(brand)}</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700">${escapeHtml(input.title)}</h1>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:28px 32px 8px;font-size:15px;line-height:1.6;color:#334155">
              ${input.bodyHtml}
            </td>
          </tr>
          ${cta ? `<tr><td class="px" style="padding:0 32px">${cta}</td></tr>` : ''}
          <tr>
            <td class="px" style="padding:8px 32px 28px;font-size:12px;line-height:1.5;color:#64748B;border-top:1px solid #E2E8F0">
              <p style="margin:16px 0 0">This message was sent by ${escapeHtml(brand)}. If you did not expect it, contact support.</p>
              <p style="margin:8px 0 0">© ${year} ${escapeHtml(brand)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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

export function detailRows(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:13px;width:40%">${escapeHtml(label)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#0F172A;font-size:13px;font-weight:600;text-align:right">${escapeHtml(value)}</td>
    </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-collapse:collapse">${cells}</table>`
}
