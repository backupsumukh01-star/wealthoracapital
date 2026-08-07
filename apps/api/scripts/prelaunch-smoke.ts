/**
 * Pre-launch smoke: health + auth + finance paths must not 500.
 */
import { createHash, randomUUID } from 'node:crypto'
import request from 'supertest'

import { createApp } from '../src/app.js'

const app = createApp()

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

function assertOk(label: string, res: { status: number; body: unknown }, allowed = [200, 201]) {
  if (!allowed.includes(res.status)) {
    throw new Error(`${label} → ${res.status}: ${JSON.stringify(res.body).slice(0, 400)}`)
  }
}

async function main() {
  const failures: string[] = []

  for (const path of [
    '/api/health',
    '/api/version',
    '/api/v1/csrf',
    '/api/v1/cms/public',
    '/api/v1/settings/public',
  ]) {
    const res = await request(app).get(path)
    if (res.status >= 500) failures.push(`${path} → ${res.status}`)
    else console.log('OK', path, res.status)
  }

  const email = `smoke_${randomUUID().slice(0, 8)}@example.com`
  const password = 'SecurePass1!'
  const reg = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Smoke',
    lastName: 'Test',
    acceptTerms: true,
    acceptRisk: true,
  })
  assertOk('register', reg, [201])

  const { prisma } = await import('../src/database/prisma.js')
  const user = await prisma.user.findFirst({ where: { email } })
  if (!user) throw new Error('user missing after register')
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date(), kycStatus: 'APPROVED' },
  })

  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  assertOk('login', login)
  const csrf = login.body.data.csrfToken as string

  for (const path of [
    '/api/v1/auth/me',
    '/api/v1/wallet',
    '/api/v1/wallet/summary',
    '/api/v1/deposits',
    '/api/v1/withdrawals',
    '/api/v1/kyc/me',
    '/api/v1/kyc/status',
    '/api/v1/performance/summary',
    '/api/v1/performance/distributions',
    '/api/v1/trades',
    '/api/v1/notifications',
    '/api/v1/support/tickets',
    '/api/v1/reports',
  ]) {
    const res = await agent.get(path)
    if (res.status >= 500) failures.push(`user ${path} → ${res.status}`)
    else console.log('OK user', path, res.status)
  }

  const methods = await agent.get('/api/v1/deposits/methods')
  assertOk('deposit methods', methods, [200])
  const methodItems = (methods.body.data?.items ?? methods.body.data ?? []) as Array<{ id: string }>
  const methodId = methodItems[0]?.id
  if (methodId) {
    const dep = await agent
      .post('/api/v1/deposits')
      .set('x-csrf-token', csrf)
      .send({
        amount: '100.00',
        methodId,
        idempotencyKey: `smoke-dep-${randomUUID()}`,
      })
    if (dep.status >= 500) failures.push(`deposit create → ${dep.status}`)
    else console.log('OK deposit create', dep.status)
  } else {
    console.log('SKIP deposit create (no methods)')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
  })
  await agent.post('/api/v1/auth/logout').set('x-csrf-token', csrf)
  const login2 = await agent.post('/api/v1/auth/login').send({ email, password })
  assertOk('admin login', login2)
  const csrf2 = login2.body.data.csrfToken as string

  for (const path of [
    '/api/v1/admin/dashboard',
    '/api/v1/admin/users',
    '/api/v1/admin/deposits',
    '/api/v1/admin/withdrawals',
    '/api/v1/admin/wallets',
    '/api/v1/admin/kyc',
    '/api/v1/admin/trades',
    '/api/v1/admin/returns',
    '/api/v1/admin/reports',
    '/api/v1/admin/support',
    '/api/v1/admin/support/metrics',
    '/api/v1/admin/roles',
  ]) {
    const res = await agent.get(path)
    if (res.status >= 500) failures.push(`admin ${path} → ${res.status}`)
    else console.log('OK admin', path, res.status)
  }

  const { ledgerService } = await import('../src/services/finance/ledger.service.js')
  const { distributionService } = await import('../src/services/trading/distribution.service.js')
  const { d } = await import('../src/utils/money.js')
  const investment = await ledgerService.getInvestmentWallet(user.id)
  await prisma.$transaction(async (tx) => {
    await ledgerService.creditAvailable(tx, {
      userId: user.id,
      walletId: investment.id,
      amount: d('500'),
      entryType: 'ADJUSTMENT_CREDIT',
      transactionType: 'ADMIN_ADJUSTMENT',
      description: 'smoke seed',
      referenceType: 'ADMIN_ADJUSTMENT',
      referenceId: user.id,
      createdById: user.id,
      idempotencyKey: `smoke-seed-${randomUUID()}`,
      bumpInvested: true,
      bumpDeposited: true,
    })
  })

  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - 3)
  const run = await distributionService.publishReturn(
    user.id,
    {
      date: date.toISOString().slice(0, 10),
      returnPct: '0.25',
      idempotencyKey: `smoke-roi-${randomUUID()}`,
    },
    {},
  )
  console.log('OK daily return', run.status)

  const { emailOtpService } = await import('../src/services/email-otp.service.js')
  const payout = await prisma.payoutMethod.create({
    data: {
      userId: user.id,
      label: 'Smoke USDT',
      type: 'USDT_TRC20',
      details: { address: 'TSMOKE' },
      maskedDetails: 'TSMOKE••••',
      isDefault: true,
      isVerified: true,
    },
  })
  const otp = '424242'
  await emailOtpService.invalidatePrior(user.id, 'WITHDRAWAL_OTP')
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOtp(`WDR:${user.id}:${otp}:${Date.now()}`),
      type: 'EMAIL_CHANGE',
      expiresAt: new Date(Date.now() + 600_000),
      payload: {
        otpKind: 'WITHDRAWAL_OTP',
        attempts: 0,
        otpHash: hashOtp(otp),
        amount: '25.00',
        payoutMethodId: payout.id,
      },
    },
  })
  const wd = await agent
    .post('/api/v1/withdrawals')
    .set('x-csrf-token', csrf2)
    .send({
      amount: '25.00',
      payoutMethodId: payout.id,
      otp,
      idempotencyKey: `smoke-wd-${randomUUID()}`,
    })
  if (wd.status >= 500) failures.push(`withdrawal create → ${wd.status}`)
  else console.log('OK withdrawal create', wd.status)

  const exp = await agent
    .post('/api/v1/reports/export')
    .set('x-csrf-token', csrf2)
    .send({
      type: 'PERFORMANCE',
      from: '2025-01-01',
      to: '2026-12-31',
      format: 'PDF',
    })
  if (exp.status >= 500) failures.push(`report export → ${exp.status}`)
  else console.log('OK report export', exp.status)

  if (failures.length) {
    console.error('FAILURES', failures)
    process.exit(1)
  }
  console.log('SMOKE_PASS')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
