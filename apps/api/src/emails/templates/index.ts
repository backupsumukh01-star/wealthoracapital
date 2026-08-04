import { env } from '../../config/env.js'
import type { EmailTemplateName } from '../email.types.js'

interface RenderedEmail {
  subject: string
  text: string
  html: string
}

function wrapHtml(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <h1 style="font-size:20px">${title}</h1>
    ${body}
    <p style="color:#666;font-size:12px">— ${env.APP_NAME}</p>
  </body>
</html>`
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  variables: Record<string, string>,
): RenderedEmail {
  switch (template) {
    case 'email-verification': {
      const link = `${env.APP_URL}/verify-email?token=${encodeURIComponent(variables.token ?? '')}`
      return {
        subject: `Verify your ${env.APP_NAME} email`,
        text: `Hi ${variables.firstName},\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
        html: wrapHtml(
          'Verify your email',
          `<p>Hi ${variables.firstName},</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
        ),
      }
    }
    case 'password-reset': {
      const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(variables.token ?? '')}`
      return {
        subject: `Reset your ${env.APP_NAME} password`,
        text: `Hi ${variables.firstName},\n\nReset your password: ${link}\n\nThis link expires in 1 hour.`,
        html: wrapHtml(
          'Reset your password',
          `<p>Hi ${variables.firstName},</p><p><a href="${link}">Reset password</a></p><p>This link expires in 1 hour.</p>`,
        ),
      }
    }
    case 'welcome':
      return {
        subject: `Welcome to ${env.APP_NAME}`,
        text: `Hi ${variables.firstName},\n\nYour email is verified. Welcome aboard.`,
        html: wrapHtml('Welcome', `<p>Hi ${variables.firstName},</p><p>Your email is verified. Welcome aboard.</p>`),
      }
    case 'registration-attempt':
      return {
        subject: `Registration attempt on your ${env.APP_NAME} account`,
        text: `Hi ${variables.firstName},\n\nSomeone tried to register using your email. If this was you, sign in or reset your password.`,
        html: wrapHtml(
          'Registration attempt',
          `<p>Hi ${variables.firstName},</p><p>Someone tried to register using your email. If this was you, sign in or reset your password.</p>`,
        ),
      }
    case 'security-alert':
      return {
        subject: `${env.APP_NAME} security alert`,
        text: `Hi ${variables.firstName},\n\n${variables.message}`,
        html: wrapHtml('Security alert', `<p>Hi ${variables.firstName},</p><p>${variables.message}</p>`),
      }
    case 'custom':
      // DB-managed templates (Phase 6) render through `emailTemplateService`, not this
      // static renderer — reaching this case means a caller passed 'custom' by mistake.
      throw new Error('The "custom" template must be rendered via emailTemplateService, not renderEmailTemplate.')
    default: {
      const exhaustive: never = template
      throw new Error(`Unhandled email template: ${String(exhaustive)}`)
    }
  }
}
