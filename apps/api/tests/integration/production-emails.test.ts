import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { emailService } from '../../src/emails/email.service.js'
import { senderForCategory, resolveSender } from '../../src/emails/sender.js'
import { renderEmailTemplate, PRODUCTION_EMAIL_TEMPLATES } from '../../src/emails/templates/index.js'
import type { EmailMessage, EmailTransport } from '../../src/emails/email.types.js'

const FIXTURES: Record<string, Record<string, string>> = {
  welcome: {
    firstName: 'Aisha',
    username: 'aisha.k',
    userId: 'usr_demo_001',
    registeredAt: '2026-08-05',
    time: '18:30:00Z',
  },
  'email-verification': { firstName: 'Aisha', token: 'verify-token-demo' },
  'login-otp': {
    firstName: 'Aisha',
    otp: '482910',
    ip: '203.0.113.10',
    browser: 'Chrome 126',
    os: 'Windows 11',
    country: 'United Arab Emirates',
    device: 'Desktop',
    time: '2026-08-05T18:30:00Z',
  },
  'withdrawal-otp': {
    firstName: 'Aisha',
    otp: '719304',
    amount: '250.00 USD',
    wallet: '0xAB…91f2',
    network: 'USDT · TRC20',
    withdrawalId: 'WD-TEST456',
  },
  'password-reset': {
    firstName: 'Aisha',
    token: 'reset-token-demo',
    ip: '203.0.113.10',
    browser: 'Safari 17',
    time: '2026-08-05T18:30:00Z',
  },
  'security-alert': {
    firstName: 'Aisha',
    message: 'Your account was locked after multiple failed login attempts.',
  },
  'registration-attempt': { firstName: 'Aisha' },
  'deposit-submitted': {
    firstName: 'Aisha',
    reference: 'DEP-TEST123',
    amount: '500.00 USD',
    currency: 'USD',
    method: 'USDT TRC20',
    date: '2026-08-05',
    time: '18:30:00Z',
    status: 'Pending review',
  },
  'deposit-approved': {
    firstName: 'Aisha',
    reference: 'DEP-TEST123',
    amount: '500.00 USD',
    walletBalance: '1,250.00 USD',
    approvalTime: '2026-08-05T19:00:00Z',
  },
  'deposit-rejected': {
    firstName: 'Aisha',
    reference: 'DEP-TEST123',
    amount: '500.00 USD',
    reason: 'UTR could not be verified',
  },
  'withdrawal-submitted': {
    firstName: 'Aisha',
    reference: 'WD-TEST456',
    amount: '200.00 USD',
    wallet: '0xAB…91f2',
    network: 'USDT · TRC20',
    date: '2026-08-05',
    time: '18:30:00Z',
    status: 'Under review',
  },
  'withdrawal-approved': {
    firstName: 'Aisha',
    reference: 'WD-TEST456',
    amount: '200.00 USD',
    fee: '2.00 USD',
    netAmount: '198.00 USD',
    destination: '0xAB…91f2',
    approvalTime: '2026-08-05T19:10:00Z',
  },
  'withdrawal-rejected': {
    firstName: 'Aisha',
    reference: 'WD-TEST456',
    amount: '200.00 USD',
    reason: 'Destination details incomplete',
    date: '2026-08-05',
  },
  'kyc-submitted': {
    firstName: 'Aisha',
    submissionId: 'KYC-A1B2C3D4',
    submittedAt: '2026-08-05T18:00:00Z',
    documents: 'National ID · Selfie · Address proof',
    status: 'Under review',
    eta: '24–48 hours',
  },
  'kyc-under-review': {
    firstName: 'Aisha',
    stage: 'Under review',
    eta: '24–48 hours',
  },
  'kyc-approved': {
    firstName: 'Aisha',
    verifiedName: 'Aisha Khan',
    approvedAt: '2026-08-06T10:00:00Z',
  },
  'kyc-rejected': {
    firstName: 'Aisha',
    reason: 'Document image is blurry',
    submittedAt: '2026-08-05T18:00:00Z',
    reviewedAt: '2026-08-06T10:00:00Z',
    rejectedBy: 'Compliance Officer',
    corrections: 'Re-upload a clear, uncropped ID photo',
  },
  'daily-roi': {
    firstName: 'Aisha',
    returnPct: '0.85',
    profit: '42.50 USD',
    openingBalance: '5,000.00 USD',
    closingBalance: '5,042.50 USD',
    portfolioValue: '5,042.50 USD',
    totalProfit: '542.50 USD',
    earningsTillDate: '542.50 USD',
    investmentValue: '5,000.00 USD',
    monthlyProfit: '312.00 USD',
    date: '2026-08-05',
    sparkline: '0.3,0.5,0.4,0.7,0.6,0.9,0.85',
    shareProgressUrl: 'https://growzycapital.com/progress-share?t=test-share-token',
  },
  'investment-created': {
    firstName: 'Aisha',
    plan: 'Growth Desk',
    amount: '1,000.00 USD',
    expectedRoi: '0.8–1.2% daily',
    startDate: '2026-08-05',
    maturityDate: 'Open',
  },
  'investment-completed': {
    firstName: 'Aisha',
    duration: '30 days',
    totalProfit: '240.00 USD',
    totalReturned: '1,240.00 USD',
  },
  'support-reply': {
    firstName: 'Aisha',
    reference: 'TCK-AABB',
    subject: 'Deposit not credited',
    message: 'We are reviewing your UTR and will update you within one business day.',
    agentName: 'Sara · Support',
  },
  'admin-alert': {
    alertTitle: 'Deposit submitted',
    alertBody: 'investor@example.com submitted deposit DEP-TEST123 for 500.00 USD.',
    reference: 'DEP-TEST123',
    adminLink: 'https://growzycapital.com/admin/deposits',
    fieldsJson: JSON.stringify({
      'User name': 'Aisha Khan',
      'User ID': 'usr_demo_001',
      Email: 'aisha@example.com',
      Amount: '500.00 USD',
      IP: '203.0.113.10',
      Status: 'PENDING',
    }),
  },
  broadcast: {
    firstName: 'Aisha',
    title: 'Desk update',
    body: 'Markets were active today. Your portfolio continues to track published returns.',
    kind: 'Trading update',
  },
  'platform-notification': {
    firstName: 'Aisha',
    title: 'Scheduled maintenance',
    body: 'Growzy will perform maintenance on Saturday 02:00–04:00 UTC. Trading and withdrawals pause during the window.',
    kind: 'Maintenance',
  },
}

describe('Production email system V2', () => {
  const outDir = path.resolve(process.cwd(), '../../docs/qa/email-previews')
  const mobileDir = path.resolve(outDir, 'mobile')
  const desktopDir = path.resolve(outDir, 'desktop')

  it('resolves institutional sender lanes', () => {
    expect(resolveSender('auth').email).toBe('noreply@growzycapital.com')
    expect(resolveSender('support').email).toBe('support@growzycapital.com')
    expect(resolveSender('finance').email).toBe('info@growzycapital.com')
    expect(senderForCategory('Security').email).toBe('noreply@growzycapital.com')
    expect(senderForCategory('KYC').email).toBe('support@growzycapital.com')
    expect(senderForCategory('Finance').email).toBe('info@growzycapital.com')
  })

  it('renders every production template as premium responsive HTML', () => {
    mkdirSync(outDir, { recursive: true })
    mkdirSync(mobileDir, { recursive: true })
    mkdirSync(desktopDir, { recursive: true })

    for (const key of PRODUCTION_EMAIL_TEMPLATES) {
      const vars = FIXTURES[key]
      expect(vars, key).toBeTruthy()
      const rendered = renderEmailTemplate(key, vars!)
      expect(rendered.subject.length).toBeGreaterThan(3)
      expect(rendered.html).toContain('viewport')
      expect(rendered.html).toContain('max-width:560px')
      expect(rendered.html).toMatch(/@media only screen/)
      expect(rendered.html).toContain('Growzy')
      expect(rendered.html).toContain('will never ask for your password or OTP')
      expect(rendered.html).toContain('support@growzycapital.com')
      expect(rendered.text.length).toBeGreaterThan(10)

      writeFileSync(path.join(outDir, `${key}.html`), rendered.html, 'utf8')
      writeFileSync(
        path.join(outDir, `${key}.json`),
        JSON.stringify({ subject: rendered.subject, text: rendered.text }, null, 2),
        'utf8',
      )

      // Desktop / mobile preview shells for QA screenshots
      const desktopShell = `<!doctype html><html><head><meta charset="utf-8"><title>${key} desktop</title>
        <style>body{margin:0;background:#1a1a1a;padding:24px}iframe{width:680px;height:900px;border:0;border-radius:12px;background:#fff}</style></head>
        <body><iframe src="../${key}.html"></iframe></body></html>`
      const mobileShell = `<!doctype html><html><head><meta charset="utf-8"><title>${key} mobile</title>
        <style>body{margin:0;background:#1a1a1a;display:flex;justify-content:center;padding:24px}
        .phone{width:390px;height:844px;border-radius:28px;overflow:hidden;border:8px solid #333;background:#000}
        iframe{width:100%;height:100%;border:0}</style></head>
        <body><div class="phone"><iframe src="../${key}.html"></iframe></div></body></html>`
      writeFileSync(path.join(desktopDir, `${key}.html`), desktopShell, 'utf8')
      writeFileSync(path.join(mobileDir, `${key}.html`), mobileShell, 'utf8')
    }
  })

  it('kyc-rejected includes exact admin reason and Upload again CTA', () => {
    const rendered = renderEmailTemplate('kyc-rejected', FIXTURES['kyc-rejected']!)
    expect(rendered.html).toContain('Document image is blurry')
    expect(rendered.html).toContain('Upload again')
    expect(rendered.html).toContain('REJECTED')
  })

  it('login-otp includes premium OTP card and device context', () => {
    const rendered = renderEmailTemplate('login-otp', FIXTURES['login-otp']!)
    expect(rendered.html).toContain('482910')
    expect(rendered.html).toContain('203.0.113.10')
    expect(rendered.html).toContain('Secure account')
  })

  it('daily-roi includes performance summary fields', () => {
    const rendered = renderEmailTemplate('daily-roi', FIXTURES['daily-roi']!)
    expect(rendered.html).toContain('0.85')
    expect(rendered.html).toContain('Investment')
    expect(rendered.html).toContain('New available balance')
    expect(rendered.html).toContain('Earnings Till Date')
    expect(rendered.html).toContain('542.50')
    expect(rendered.html).toContain('View dashboard')
    expect(rendered.html).toContain('Share My Progress')
    expect(rendered.html).toContain('progress-share?t=test-share-token')
    expect(rendered.text).toContain('Share My Progress')
  })

  it('dispatches every production email through the transport contract', async () => {
    const sent: EmailMessage[] = []
    const transport: EmailTransport = {
      send: async (message) => {
        sent.push(message)
      },
    }
    for (const key of PRODUCTION_EMAIL_TEMPLATES) {
      const vars = FIXTURES[key]!
      const rendered = renderEmailTemplate(key, vars)
      await transport.send({
        to: 'qa@example.com',
        subject: rendered.subject,
        template: key,
        variables: vars,
        text: rendered.text,
        html: rendered.html,
      })
    }
    expect(sent).toHaveLength(PRODUCTION_EMAIL_TEMPLATES.length)
  })

  it('emailService methods send without throwing', async () => {
    await expect(
      emailService.sendWelcomeEmail({
        to: 'qa@example.com',
        firstName: 'Aisha',
        userId: 'usr_1',
      }),
    ).resolves.toBeUndefined()
    await expect(
      emailService.sendLoginOtp({
        to: 'qa@example.com',
        firstName: 'Aisha',
        otp: '123456',
        ip: '1.1.1.1',
      }),
    ).resolves.toBeUndefined()
    await expect(
      emailService.sendKycRejected({
        to: 'qa@example.com',
        firstName: 'Aisha',
        reason: 'Photo cropped',
      }),
    ).resolves.toBeUndefined()
    await expect(
      emailService.sendDailyRoi({
        to: 'qa@example.com',
        firstName: 'Aisha',
        returnPct: '0.5',
        profit: '10.00',
      }),
    ).resolves.toBeUndefined()
  })
})
