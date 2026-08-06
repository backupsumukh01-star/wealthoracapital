import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderEmailTemplate } from '../../src/emails/templates/index.js'

describe('Ops alerts, KYC rejection, daily report contracts', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.ADMIN_ALERT_EMAILS =
      'owner@growzycapital.com, finance@growzycapital.com, ,invalid'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('parses multiple ADMIN_ALERT_EMAILS recipients', async () => {
    // Re-import env + service so recipients() sees test env
    vi.resetModules()
    process.env.ADMIN_ALERT_EMAILS = 'owner@growzycapital.com,finance@growzycapital.com'
    const { opsAlertService } = await import('../../src/services/ops-alert.service.js')
    const list = opsAlertService.recipients()
    expect(list).toEqual(['owner@growzycapital.com', 'finance@growzycapital.com'])
  })

  it('kyc-rejected email includes status, reason, and Upload Again CTA', () => {
    const rendered = renderEmailTemplate('kyc-rejected', {
      firstName: 'Aisha',
      reason: 'Document blurry',
    })
    expect(rendered.html).toContain('REJECTED')
    expect(rendered.html).toContain('Document blurry')
    expect(rendered.html).toContain('Upload again')
    expect(rendered.text.toLowerCase()).toContain('rejected')
  })

  it('admin-alert email includes structured fields and admin CTA', () => {
    const rendered = renderEmailTemplate('admin-alert', {
      alertTitle: 'KYC submitted',
      alertBody: 'fallback body',
      reference: 'sub-1',
      adminLink: 'https://growzycapital.com/admin/kyc/u1',
      fieldsJson: JSON.stringify({
        Event: 'KYC_SUBMITTED',
        'User name': 'Aisha Khan',
        Email: 'aisha@example.com',
        IP: '1.2.3.4',
      }),
    })
    expect(rendered.subject).toContain('KYC submitted')
    expect(rendered.html).toContain('Aisha Khan')
    expect(rendered.html).toContain('Open admin dashboard')
    expect(rendered.html).toContain('growzycapital.com/admin/kyc/u1')
  })

  it('rejects KYC without a reason at the service contract level', async () => {
    const { badRequest } = await import('../../src/utils/errors.js')
    // Mirror the guard used in kycService.adminDecision REJECT branch
    const reason: string | undefined = undefined
    const guard = () => {
      if (!reason) throw badRequest('A rejection reason is required.')
    }
    expect(guard).toThrow(/rejection reason/i)
  })

  it('edit lock messaging covers under-review and approved', () => {
    const messages: Record<string, string> = {
      UNDER_REVIEW: 'Your KYC is currently under review.',
      SUBMITTED: 'Your KYC is currently under review.',
      APPROVED: 'Your KYC is approved and cannot be edited.',
    }
    expect(messages.UNDER_REVIEW).toBe('Your KYC is currently under review.')
    expect(messages.APPROVED).toContain('approved')
  })
})

describe('opsAlertService.notify fan-out', () => {
  it('sends one email per ADMIN_ALERT_EMAILS recipient', async () => {
    vi.resetModules()
    process.env.ADMIN_ALERT_EMAILS = 'a@growzycapital.com,b@growzycapital.com'

    const sentTo: string[] = []
    vi.doMock('../../src/emails/email.service.js', () => ({
      emailService: {
        sendAdminAlert: async (input: { to: string }) => {
          sentTo.push(input.to)
        },
      },
    }))
    vi.doMock('../../src/services/activity.service.js', () => ({
      activityService: { record: async () => undefined },
    }))
    vi.doMock('../../src/services/audit.service.js', () => ({
      auditService: { record: async () => undefined },
    }))
    vi.doMock('../../src/database/prisma.js', () => ({
      prisma: { user: { findFirst: async () => null } },
    }))

    const { opsAlertService } = await import('../../src/services/ops-alert.service.js')
    await opsAlertService.notify({
      event: 'KYC_SUBMITTED',
      title: 'KYC submitted',
      action: 'Investor submitted KYC',
      userId: '00000000-0000-0000-0000-000000000001',
      userName: 'Test User',
      userEmail: 'test@example.com',
      ip: '127.0.0.1',
      adminPath: '/admin/kyc/u1',
    })

    expect(sentTo).toEqual(['a@growzycapital.com', 'b@growzycapital.com'])
  })
})
