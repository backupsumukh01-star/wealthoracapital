import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../database/prisma.js'
import { adminUserPermanentDeleteService } from './admin-user-permanent-delete.service.js'
import { ledgerService } from './finance/ledger.service.js'

async function ensureSystemAccounts() {
  for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      create: { code, name: code, accountType: 'ASSET', isSystem: true },
      update: {},
    })
  }
}

async function createInvestor(opts?: {
  emailPrefix?: string
  referredById?: string
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  staffRole?: 'SUPER_ADMIN' | null
}) {
  const email = `${opts?.emailPrefix ?? 'pdel'}_${randomUUID().slice(0, 8)}@example.com`
  return prisma.user.create({
    data: {
      email,
      passwordHash: 'x',
      firstName: 'Del',
      lastName: 'Test',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      role: opts?.role ?? 'USER',
      staffRole: opts?.staffRole ?? null,
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
}

describe('adminUserPermanentDeleteService', () => {
  let superAdminId = ''

  beforeAll(async () => {
    await ensureSystemAccounts()
    const admin = await createInvestor({
      emailPrefix: 'pdel_sa',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    })
    superAdminId = admin.id
  })

  afterAll(async () => {
    if (superAdminId) {
      await prisma.session.deleteMany({ where: { userId: superAdminId } })
      await prisma.user.deleteMany({ where: { id: superAdminId } }).catch(() => undefined)
    }
  })

  it('deletes one user while preserving referrer, descendants, and unrelated users', async () => {
    const A = await createInvestor({ emailPrefix: 'pdel_a' })
    const B = await createInvestor({ emailPrefix: 'pdel_b', referredById: A.id })
    const C = await createInvestor({ emailPrefix: 'pdel_c', referredById: B.id })
    const D = await createInvestor({ emailPrefix: 'pdel_d', referredById: B.id })
    const unrelated = await createInvestor({ emailPrefix: 'pdel_u' })

    await ledgerService.ensureWalletsForUser(B.id)
    await prisma.session.create({
      data: {
        userId: B.id,
        refreshTokenHash: `hash_${randomUUID()}`,
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    })

    const exportZip = await adminUserPermanentDeleteService.buildExportArchive(superAdminId, B.id)
    expect(exportZip.body.length).toBeGreaterThan(100)
    expect(exportZip.filename).toContain('user-export')

    const result = await adminUserPermanentDeleteService.permanentDelete(
      superAdminId,
      B.id,
      {
        confirmPhrase: 'DELETE',
        exportAcknowledged: true,
        reason: 'vitest permanent delete',
      },
      {},
    )
    expect(result.deleted).toBe(true)

    expect(await prisma.user.findUnique({ where: { id: B.id } })).toBeNull()
    expect(await prisma.session.count({ where: { userId: B.id } })).toBe(0)
    expect(await prisma.wallet.count({ where: { userId: B.id } })).toBe(0)

    const a2 = await prisma.user.findUniqueOrThrow({ where: { id: A.id } })
    const c2 = await prisma.user.findUniqueOrThrow({ where: { id: C.id } })
    const d2 = await prisma.user.findUniqueOrThrow({ where: { id: D.id } })
    const u2 = await prisma.user.findUniqueOrThrow({ where: { id: unrelated.id } })

    expect(a2.email).toBe(A.email)
    expect(u2.email).toBe(unrelated.email)
    expect(c2.referredById).toBeNull()
    expect(d2.referredById).toBeNull()

    // Same email can register-equivalent: create fresh user with former B email
    const fresh = await prisma.user.create({
      data: {
        email: B.email,
        passwordHash: 'fresh',
        firstName: 'New',
        lastName: 'User',
        status: 'ACTIVE',
        role: 'USER',
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })
    expect(fresh.id).not.toBe(B.id)
    await ledgerService.ensureWalletsForUser(fresh.id)
    const freshWallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: fresh.id, kind: 'INVESTMENT' },
    })
    expect(Number(freshWallet.balance)).toBe(0)

    // cleanup
    await prisma.wallet.deleteMany({ where: { userId: { in: [A.id, C.id, D.id, unrelated.id, fresh.id] } } })
    await prisma.user.deleteMany({
      where: { id: { in: [A.id, C.id, D.id, unrelated.id, fresh.id] } },
    })
  })

  it('rejects deletion without export acknowledgement or confirm phrase', async () => {
    const target = await createInvestor({ emailPrefix: 'pdel_block' })
    await expect(
      adminUserPermanentDeleteService.permanentDelete(
        superAdminId,
        target.id,
        { confirmPhrase: 'DELETE', exportAcknowledged: false },
        {},
      ),
    ).rejects.toThrow(/export/i)

    await expect(
      adminUserPermanentDeleteService.permanentDelete(
        superAdminId,
        target.id,
        { confirmPhrase: 'WRONG', exportAcknowledged: true },
        {},
      ),
    ).rejects.toThrow(/DELETE/)

    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull()
    await prisma.user.delete({ where: { id: target.id } })
  })

  it('rejects unauthorized actor', async () => {
    const target = await createInvestor({ emailPrefix: 'pdel_authz' })
    const plainAdmin = await createInvestor({ emailPrefix: 'pdel_admin', role: 'ADMIN' })
    await expect(
      adminUserPermanentDeleteService.permanentDelete(
        plainAdmin.id,
        target.id,
        { confirmPhrase: 'DELETE', exportAcknowledged: true },
        {},
      ),
    ).rejects.toThrow(/SUPER_ADMIN/i)
    await prisma.user.deleteMany({ where: { id: { in: [target.id, plainAdmin.id] } } })
  })
})
