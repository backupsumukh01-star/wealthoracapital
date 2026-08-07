import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { buildPermissionMatrix, resolvePermissions } from '../../src/config/permissions.js'

const app = createApp()

async function registerActive(email: string, password = 'SecurePass1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Rbac',
    lastName: 'Test',
    acceptTerms: true,
    acceptRisk: true,
  })
  const { prisma } = await import('../../src/database/prisma.js')
  const user = await prisma.user.findFirst({ where: { email } })
  await prisma.user.update({
    where: { id: user!.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  })
  return user!.id
}

async function loginAgent(email: string, password = 'SecurePass1!') {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  const csrf = login.body.data.csrfToken as string
  return { agent, csrf }
}

describe('Production RBAC', () => {
  it('exposes a complete permission matrix from GET /admin/roles', async () => {
    const email = `rbac_sa_${randomUUID().slice(0, 8)}@example.com`
    const userId = await registerActive(email)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })

    const { agent } = await loginAgent(email)
    const res = await agent.get('/api/v1/admin/roles')
    expect(res.status).toBe(200)
    expect(res.body.data.matrix.permissions.length).toBeGreaterThan(30)
    expect(res.body.data.matrix.roles.map((r: { roleKey: string }) => r.roleKey)).toContain(
      'INVESTOR',
    )
    expect(res.body.data.matrix.matrix['finance.review'].FINANCE).toBe(true)
    expect(res.body.data.matrix.matrix['finance.review'].VIEWER).toBe(false)
  })

  it('invalidates JWT sessions when staffRole changes', async () => {
    const targetEmail = `rbac_tgt_${randomUUID().slice(0, 8)}@example.com`
    const actorEmail = `rbac_act_${randomUUID().slice(0, 8)}@example.com`
    const targetId = await registerActive(targetEmail)
    const actorId = await registerActive(actorEmail)

    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id: actorId },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })
    await prisma.user.update({
      where: { id: targetId },
      data: { role: 'ADMIN', staffRole: 'SUPPORT' },
    })

    const { agent: targetAgent } = await loginAgent(targetEmail)
    const meBefore = await targetAgent.get('/api/v1/auth/me')
    expect(meBefore.status).toBe(200)
    expect(meBefore.body.data.user.staffRole).toBe('SUPPORT')
    expect(meBefore.body.data.user.permissions).toContain('support.manage')

    const { agent: actorAgent, csrf } = await loginAgent(actorEmail)
    const patch = await actorAgent
      .patch(`/api/v1/admin/users/${targetId}`)
      .set('x-csrf-token', csrf)
      .send({ staffRole: 'VIEWER' })
    expect(patch.status).toBe(200)
    expect(patch.body.data.staffRole).toBe('VIEWER')

    const meAfter = await targetAgent.get('/api/v1/auth/me')
    expect(meAfter.status).toBe(401)
  })

  it('enforces force-logout privilege hierarchy', async () => {
    const supportEmail = `rbac_sup_${randomUUID().slice(0, 8)}@example.com`
    const viewerEmail = `rbac_view_${randomUUID().slice(0, 8)}@example.com`
    const adminEmail = `rbac_adm_${randomUUID().slice(0, 8)}@example.com`

    const supportId = await registerActive(supportEmail)
    const viewerId = await registerActive(viewerEmail)
    const adminId = await registerActive(adminEmail)

    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id: supportId },
      data: { role: 'ADMIN', staffRole: 'SUPPORT' },
    })
    await prisma.user.update({
      where: { id: viewerId },
      data: { role: 'ADMIN', staffRole: 'VIEWER' },
    })
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN', staffRole: 'ADMIN' },
    })

    const { agent: supportAgent, csrf: supportCsrf } = await loginAgent(supportEmail)
    await loginAgent(viewerEmail)

    // Support (40) cannot force-logout Admin (80)
    const up = await supportAgent
      .post(`/api/v1/admin/users/${adminId}/force-logout`)
      .set('x-csrf-token', supportCsrf)
      .send({})
    expect(up.status).toBe(403)

    // Support can force-logout Viewer (20)
    const down = await supportAgent
      .post(`/api/v1/admin/users/${viewerId}/force-logout`)
      .set('x-csrf-token', supportCsrf)
      .send({})
    expect(down.status).toBe(200)
    expect(down.body.data.revokedSessions).toBeGreaterThanOrEqual(1)

    // Cannot force-logout self
    const self = await supportAgent
      .post(`/api/v1/admin/users/${supportId}/force-logout`)
      .set('x-csrf-token', supportCsrf)
      .send({})
    expect(self.status).toBe(400)
  })

  it('FINANCE cannot access CMS-manage routes', async () => {
    const email = `rbac_cms_${randomUUID().slice(0, 8)}@example.com`
    const id = await registerActive(email)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id },
      data: { role: 'ADMIN', staffRole: 'FINANCE' },
    })
    const { agent } = await loginAgent(email)
    const dash = await agent.get('/api/v1/admin/dashboard')
    expect(dash.status).toBe(200)
    const media = await agent.get('/api/v1/admin/media')
    expect([403, 404]).toContain(media.status)
  })

  it('buildPermissionMatrix matches resolvePermissions', () => {
    const matrix = buildPermissionMatrix()
    for (const role of matrix.roles) {
      const resolved =
        role.roleKey === 'INVESTOR'
          ? resolvePermissions({ role: 'USER', staffRole: null })
          : role.roleKey === 'SUPER_ADMIN'
            ? resolvePermissions({ role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' })
            : role.roleKey === 'ADMIN'
              ? resolvePermissions({ role: 'ADMIN', staffRole: null })
              : resolvePermissions({
                  role: 'ADMIN',
                  staffRole: role.roleKey as
                    | 'FINANCE'
                    | 'SUPPORT'
                    | 'KYC'
                    | 'CONTENT'
                    | 'VIEWER',
                })
      for (const perm of matrix.permissions) {
        expect(matrix.matrix[perm]![role.roleKey]).toBe(resolved.includes(perm))
      }
    }
  })
})
