import { randomUUID } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { passwordService } from '../../src/services/password.service.js'
import { adminUserHistoryService } from '../../src/services/admin-user-history.service.js'
import { buildXlsx } from '../../src/services/historical-import-parse.js'

const app = createApp()

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function oid(prefix: string) {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`.slice(0, 32)
}

function csv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')).join('\n')
}

const HEADERS = ['Date', 'Transaction Type', 'Amount', 'Currency', 'Status', 'Order ID', 'Reference', 'Notes']

async function ensureSystemAccounts() {
  for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      create: { code, name: code, accountType: 'ASSET', isSystem: true },
      update: {},
    })
  }
}

async function registerActive(email: string, password = 'SecurePass1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Admin',
    lastName: 'Creator',
    acceptTerms: true,
    acceptRisk: true,
  })
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date(), role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
  })
  return user
}

async function loginAgent(email: string, password = 'SecurePass1!') {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return { agent, csrf: login.body.data.csrfToken as string }
}

async function createAdminUser(agent: ReturnType<typeof request.agent>, csrf: string, firstName = 'Harsh') {
  const email = uniqueEmail('manual')
  const created = await agent.post('/api/v1/admin/users').set('x-csrf-token', csrf).send({
    firstName,
    lastName: 'Patel',
    email,
    password: 'ManualPass1!',
  })
  expect([200, 201]).toContain(created.status)
  const row = await prisma.user.findFirstOrThrow({ where: { email } })
  return row
}

describe('Admin historical spreadsheet import', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lets admin download templates and rejects investor, salesman, and finance staff', async () => {
    await ensureSystemAccounts()
    const adminEmail = uniqueEmail('imp_adm')
    await registerActive(adminEmail)
    const { agent, csrf } = await loginAgent(adminEmail)
    const target = await createAdminUser(agent, csrf)

    const csvRes = await agent.get(`/api/v1/admin/users/${target.id}/history/import/template.csv`)
    expect(csvRes.status).toBe(200)
    expect(csvRes.text).toContain('WX-DEP-20260115-001')
    const xlsxRes = await agent.get(`/api/v1/admin/users/${target.id}/history/import/template.xlsx`)
    expect(xlsxRes.status).toBe(200)
    expect(String(xlsxRes.headers['content-type'])).toMatch(/spreadsheetml|octet-stream/)
    expect(String(xlsxRes.headers['content-disposition'])).toContain('wealthora-historical-import-sample.xlsx')

    const investorEmail = uniqueEmail('imp_inv')
    await request(app).post('/api/v1/auth/register').send({
      email: investorEmail,
      password: 'SecurePass1!',
      firstName: 'Inv',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    const investor = await prisma.user.findFirstOrThrow({ where: { email: investorEmail } })
    await prisma.user.update({
      where: { id: investor.id },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })
    const inv = await loginAgent(investorEmail)
    const invDenied = await inv.agent.get(`/api/v1/admin/users/${target.id}/history/import/template.csv`)
    expect(invDenied.status).toBe(403)

    const salesman = await prisma.salesman.create({
      data: {
        email: uniqueEmail('imp_sales'),
        passwordHash: await passwordService.hash('SecureSales1!'),
        name: 'Import Sales',
        code: `S${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        status: 'ACTIVE',
      },
    })
    const salesAgent = request.agent(app)
    const salesLogin = await salesAgent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password: 'SecureSales1!',
    })
    expect(salesLogin.status).toBe(200)
    const salesDenied = await salesAgent.get(`/api/v1/admin/users/${target.id}/history/import/template.csv`)
    expect([401, 403]).toContain(salesDenied.status)

    const financeEmail = uniqueEmail('imp_fin')
    await registerActive(financeEmail)
    await prisma.user.update({
      where: { id: (await prisma.user.findFirstOrThrow({ where: { email: financeEmail } })).id },
      data: { role: 'ADMIN', staffRole: 'FINANCE' },
    })
    const finance = await loginAgent(financeEmail)
    const financeDenied = await finance.agent
      .get(`/api/v1/admin/users/${target.id}/history/import/template.csv`)
    expect(financeDenied.status).toBe(403)
  })

  it('validates csv/xlsx, does not write finance on preview or cancel, then imports atomically for the opened user', async () => {
    await ensureSystemAccounts()
    const adminEmail = uniqueEmail('imp_flow')
    await registerActive(adminEmail)
    const { agent, csrf } = await loginAgent(adminEmail)
    const target = await createAdminUser(agent, csrf)
    const other = await createAdminUser(agent, csrf, 'Other')
    const otherDepRef = oid('OTH')
    await adminUserHistoryService.create(
      (await prisma.user.findFirstOrThrow({ where: { email: adminEmail } })).id,
      other.id,
      {
        activity: 'DEPOSIT',
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        amount: '25',
        currency: 'USD',
        reference: otherDepRef,
      },
      {},
    )
    const otherBefore = await prisma.deposit.count({ where: { userId: other.id } })

    const publicEmail = uniqueEmail('imp_pub')
    await request(app).post('/api/v1/auth/register').send({
      email: publicEmail,
      password: 'SecurePass1!',
      firstName: 'Public',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    const publicUser = await prisma.user.findFirstOrThrow({ where: { email: publicEmail } })
    await prisma.user.update({
      where: { id: publicUser.id },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })

    const deniedPublic = await agent
      .post(`/api/v1/admin/users/${publicUser.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from(csv([HEADERS, ['2026-01-15', 'DEPOSIT', '10', 'USD', 'APPROVED', oid('PUB'), '', '']])), 'hist.csv')
    expect(deniedPublic.status).toBe(403)

    const badExt = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from('hello'), 'hist.txt')
    expect(badExt.status).toBe(400)

    const missing = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from('Hello,World\n1,2'), 'hist.csv')
    expect(missing.status).toBe(400)

    const malformed = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from('PK garbage'), 'hist.xlsx')
    expect(malformed.status).toBe(400)

    const tooMany = [
      HEADERS,
      ...Array.from({ length: 501 }, (_, i) => [
        '2026-01-15',
        'DEPOSIT',
        '1',
        'USD',
        'APPROVED',
        oid('BIG').slice(0, 20) + String(i).padStart(4, '0'),
        '',
        '',
      ]),
    ]
    const large = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from(csv(tooMany)), 'hist.csv')
    expect(large.status).toBe(400)

    const depRef = oid('DEP')
    const wdRef = oid('WD')
    const profitRef = oid('PRF')
    const refRef = oid('REF')
    const invalidCsv = csv([
      [...HEADERS, 'User ID'],
      ['bad-date', 'DEPOSIT', '1000', 'USD', 'APPROVED', oid('BAD'), '', '', other.id],
      ['2026-01-15', 'DEPOSIT', 'nope', 'USD', 'APPROVED', oid('AMT'), '', '', other.id],
      ['2026-01-15', 'DEPOSIT', '100', 'USD', 'APPROVED', 'DUP-ORDER-001', '', '', other.id],
      ['2026-01-16', 'DEPOSIT', '100', 'USD', 'APPROVED', 'DUP-ORDER-001', '', '', other.id],
    ])
    const invalidPreview = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from(invalidCsv), 'invalid.csv')
    expect(invalidPreview.status).toBe(201)
    expect(invalidPreview.body.data.invalidCount).toBeGreaterThan(0)
    expect(invalidPreview.body.data.preview.invalid.map((r: { reason: string }) => r.reason)).toEqual(
      expect.arrayContaining(['Invalid date', 'Invalid amount', expect.stringContaining('Duplicate Order ID')]),
    )
    expect(await prisma.deposit.count({ where: { userId: target.id } })).toBe(0)

    const cancel = await agent
      .post(`/api/v1/admin/users/${target.id}/history/imports/${invalidPreview.body.data.id}/cancel`)
      .set('x-csrf-token', csrf)
    expect(cancel.status).toBe(200)
    expect(cancel.body.data.status).toBe('CANCELLED')
    expect(await prisma.deposit.count({ where: { userId: target.id } })).toBe(0)

    const goodCsv = csv([
      [...HEADERS, 'User ID', 'Referral Commission'],
      ['2026-01-15', 'DEPOSIT', '1000', 'USD', 'APPROVED', depRef, 'OXA-HIST-LOCAL', 'note', other.id, ''],
      ['2026-02-10', 'WITHDRAWAL', '250', 'USD', 'PAID', wdRef, 'WD-HIST-LOCAL', 'note', other.id, ''],
      ['2026-02-28', 'PROFIT', '75', 'USD', 'CREDITED', profitRef, 'PROFIT-HIST-LOCAL', 'note', other.id, ''],
      ['2026-03-05', 'REFERRAL', '1000', 'USD', 'CREDITED', refRef, 'REF-HIST-LOCAL', 'note', other.id, '50'],
    ])
    const preview = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from(goodCsv), 'good.csv')
    expect(preview.status).toBe(201)
    expect(preview.body.data.validCount).toBe(4)
    expect(preview.body.data.preview.ignoredUserIds).toBe(true)
    expect(await prisma.deposit.count({ where: { userId: target.id } })).toBe(0)

    const blocked = await agent
      .post(`/api/v1/admin/users/${target.id}/history/imports/${preview.body.data.id}/confirm`)
      .set('x-csrf-token', csrf)
    expect([200, 201]).toContain(blocked.status)

    const deposits = await prisma.deposit.findMany({ where: { userId: target.id } })
    expect(deposits).toHaveLength(1)
    expect(deposits[0]?.reference).toBe(depRef)
    expect(deposits[0]?.userId).toBe(target.id)
    expect((deposits[0]?.submissionDetails as { source?: string } | null)?.source).toBe('HISTORICAL_IMPORT')
    expect(await prisma.deposit.count({ where: { userId: other.id } })).toBe(otherBefore)
    expect(await prisma.deposit.findFirst({ where: { userId: other.id, reference: depRef } })).toBeNull()
    expect(await prisma.referralReward.count({ where: { referrerId: target.id } })).toBe(0)

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: target.id, kind: 'INVESTMENT' } },
    })
    expect(Number(wallet.availableBalance)).toBe(825)
    const referralWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: target.id, kind: 'REFERRAL' } },
    })
    expect(Number(referralWallet.availableBalance)).toBe(50)

    const audit = await prisma.historicalImport.findFirstOrThrow({ where: { id: preview.body.data.id } })
    expect(audit.status).toBe('COMPLETED')
    expect(audit.importedCount).toBe(4)

    const xlsxBody = buildXlsx([
      HEADERS,
      ['2026-04-01', 'DEPOSIT', '10', 'USD', 'APPROVED', oid('XL'), '', 'xlsx row'],
    ])
    const xlsxPreview = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', xlsxBody, 'hist.xlsx')
    expect(xlsxPreview.status).toBe(201)
    expect(xlsxPreview.body.data.validCount).toBe(1)

    const dupPreview = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from(goodCsv), 'good-again.csv')
    expect(dupPreview.status).toBe(201)
    expect(dupPreview.body.data.validCount).toBe(0)
    expect(dupPreview.body.data.skippedCount).toBeGreaterThan(0)
    const dupConfirm = await agent
      .post(`/api/v1/admin/users/${target.id}/history/imports/${dupPreview.body.data.id}/confirm`)
      .set('x-csrf-token', csrf)
    expect([200, 201]).toContain(dupConfirm.status)
    expect(await prisma.deposit.count({ where: { userId: target.id, reference: depRef } })).toBe(1)

    const historyList = await agent.get(`/api/v1/admin/users/${target.id}/history/imports`)
    expect(historyList.status).toBe(200)
    expect(historyList.body.data.items.length).toBeGreaterThan(0)
  })

  it('rolls back the whole import when a later row fails', async () => {
    await ensureSystemAccounts()
    const adminEmail = uniqueEmail('imp_atom')
    const admin = await registerActive(adminEmail)
    const { agent, csrf } = await loginAgent(adminEmail)
    const target = await createAdminUser(agent, csrf)
    const a = oid('A')
    const b = oid('B')
    const preview = await agent
      .post(`/api/v1/admin/users/${target.id}/history/import/preview`)
      .set('x-csrf-token', csrf)
      .attach(
        'file',
        Buffer.from(
          csv([
            HEADERS,
            ['2026-01-15', 'DEPOSIT', '100', 'USD', 'APPROVED', a, '', ''],
            ['2026-01-16', 'DEPOSIT', '40', 'USD', 'APPROVED', b, '', ''],
          ]),
        ),
        'atom.csv',
      )
    expect(preview.status).toBe(201)

    const original = adminUserHistoryService.create.bind(adminUserHistoryService)
    let calls = 0
    const spy = vi.spyOn(adminUserHistoryService, 'create').mockImplementation(async (...args) => {
      calls += 1
      if (calls === 2) throw new Error('forced failure')
      return original(...args)
    })

    const confirm = await agent
      .post(`/api/v1/admin/users/${target.id}/history/imports/${preview.body.data.id}/confirm`)
      .set('x-csrf-token', csrf)
    expect(confirm.status).toBeGreaterThanOrEqual(400)
    spy.mockRestore()
    expect(await prisma.deposit.count({ where: { userId: target.id } })).toBe(0)
    const row = await prisma.historicalImport.findFirstOrThrow({ where: { id: preview.body.data.id } })
    expect(row.status).toBe('FAILED')
    expect(admin.id).toBeTruthy()
  })

  it('keeps normal investor registration working', async () => {
    const email = uniqueEmail('imp_reg')
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'Keep',
      lastName: 'Working',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(res.status)
  })
})
