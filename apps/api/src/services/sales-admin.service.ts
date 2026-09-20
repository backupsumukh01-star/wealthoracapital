import { randomBytes } from 'node:crypto'

import { prisma } from '../database/prisma.js'
import { userRepository } from '../repositories/user.repository.js'
import { auditService } from './audit.service.js'
import { passwordService } from './password.service.js'
import { salesmanReferralLink } from './sales-identity.js'
import { generateReferralCode } from '../utils/crypto.js'
import { badRequest, conflict, notFound } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { SessionContext } from '../types/auth.types.js'

import { SALESMAN_CODE_REGEX } from '../validators/sales.validators.js'

function snapshotSalesman(row: {
  id: string
  name: string
  email: string
  code: string
  status: 'ACTIVE' | 'DISABLED'
  createdAt: Date
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    code: row.code,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    referralLink: salesmanReferralLink(row.code),
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

function generateTemporaryPassword(): string {
  const raw = randomBytes(18).toString('base64url')
  return `Wx${raw.slice(0, 10)}9!`
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * Salesman codes must be unique among salesmen only.
 * Collision with User.referralCode is intentional — ACTIVE salesman wins at registration.
 */
async function assertSalesmanCodeAvailable(code: string, exceptSalesmanId?: string): Promise<void> {
  if (!SALESMAN_CODE_REGEX.test(code)) {
    throw badRequest('Salesman code must be 2–16 letters or digits.')
  }
  const existingSalesman = await prisma.salesman.findUnique({
    where: { code },
    select: { id: true },
  })
  if (existingSalesman && existingSalesman.id !== exceptSalesmanId) {
    throw conflict('That salesman code is already in use.')
  }
}

async function allocateSalesmanCode(preferred?: string): Promise<string> {
  if (preferred) {
    const code = normalizeCode(preferred)
    await assertSalesmanCodeAvailable(code)
    return code
  }
  // Auto-allocated codes still avoid investor collisions to reduce accidental overlap.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = `S${generateReferralCode(7)}`
    const [salesman, investor] = await Promise.all([
      prisma.salesman.findUnique({ where: { code }, select: { id: true } }),
      userRepository.findByReferralCode(code),
    ])
    if (!salesman && !investor) return code
  }
  throw conflict('Could not allocate a unique salesman code.')
}

async function revokeSalesmanSessions(salesmanId: string): Promise<void> {
  await prisma.salesmanSession.updateMany({
    where: { salesmanId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export const salesAdminService = {
  async create(
    input: { name: string; email: string; code?: string },
    actorId: string,
    context: SessionContext,
  ) {
    const email = input.email.trim().toLowerCase()
    const name = input.name.trim()
    const duplicateEmail = await prisma.salesman.findUnique({
      where: { email },
      select: { id: true },
    })
    if (duplicateEmail) {
      throw conflict('A salesman with that email already exists.')
    }

    const code = await allocateSalesmanCode(input.code)
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await passwordService.hash(temporaryPassword)

    try {
      const salesman = await prisma.salesman.create({
        data: {
          name,
          email,
          code,
          passwordHash,
          status: 'ACTIVE',
          createdByAdminId: actorId,
        },
      })
      await auditService.record({
        actorId,
        action: 'salesman.create',
        module: 'sales',
        newValue: snapshotSalesman(salesman),
        ip: context.ip,
        userAgent: context.userAgent,
      })
      return {
        salesman: {
          ...snapshotSalesman(salesman),
        },
        temporaryPassword,
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict('A salesman with that email or code already exists.')
      }
      throw err
    }
  },

  async update(
    salesmanId: string,
    input: { name?: string; email?: string; status?: 'ACTIVE' | 'DISABLED'; code?: string },
    actorId: string,
    context: SessionContext,
  ) {
    const existing = await prisma.salesman.findUnique({ where: { id: salesmanId } })
    if (!existing) {
      throw notFound('Salesman not found.')
    }

    const data: { name?: string; email?: string; status?: 'ACTIVE' | 'DISABLED'; code?: string } = {}
    if (input.name !== undefined) data.name = input.name.trim()
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase()
      if (email !== existing.email) {
        const taken = await prisma.salesman.findUnique({ where: { email }, select: { id: true } })
        if (taken) throw conflict('A salesman with that email already exists.')
      }
      data.email = email
    }
    if (input.status !== undefined) data.status = input.status
    if (input.code !== undefined) {
      const code = normalizeCode(input.code)
      if (code !== existing.code) {
        await assertSalesmanCodeAvailable(code, salesmanId)
        data.code = code
      }
    }
    if (Object.keys(data).length === 0) {
      return { salesman: snapshotSalesman(existing) }
    }

    try {
      const salesman = await prisma.salesman.update({
        where: { id: salesmanId },
        data,
      })
      // Code-only changes must not revoke sessions or alter identity/password.
      if (data.status === 'DISABLED' && existing.status !== 'DISABLED') {
        await revokeSalesmanSessions(salesmanId)
      }
      await auditService.record({
        actorId,
        action: data.status && data.status !== existing.status ? `salesman.${data.status.toLowerCase()}` : 'salesman.update',
        module: 'sales',
        oldValue: snapshotSalesman(existing),
        newValue: snapshotSalesman(salesman),
        ip: context.ip,
        userAgent: context.userAgent,
      })
      return { salesman: snapshotSalesman(salesman) }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict('A salesman with that email or code already exists.')
      }
      throw err
    }
  },

  async resetPassword(salesmanId: string, actorId: string, context: SessionContext) {
    const existing = await prisma.salesman.findUnique({ where: { id: salesmanId } })
    if (!existing) {
      throw notFound('Salesman not found.')
    }
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await passwordService.hash(temporaryPassword)
    await prisma.salesman.update({
      where: { id: salesmanId },
      data: { passwordHash },
    })
    await revokeSalesmanSessions(salesmanId)
    await auditService.record({
      actorId,
      action: 'salesman.reset_password',
      module: 'sales',
      newValue: { id: existing.id, code: existing.code },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    logger.info({ salesmanId }, 'Salesman password reset by owner')
    return {
      salesman: snapshotSalesman(existing),
      temporaryPassword,
    }
  },
}
