import type { PaymentMethodType, Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { auditService } from '../audit.service.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { d, moneyString } from '../../utils/money.js'
import { mapPaymentMethod } from './finance.mappers.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

export const paymentMethodService = {
  async adminList(includeInactive = true) {
    const methods = await prisma.paymentMethod.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })
    return methods.map(mapPaymentMethod)
  },

  async create(
    actorId: string,
    body: {
      name: string
      type: PaymentMethodType
      instructions: string
      accountDetails?: Record<string, string>
      network?: string
      minAmount?: string
      maxAmount?: string | null
      feePct?: string
      processingTime?: string
      priority?: number
      isActive?: boolean
    },
    context: Ctx,
  ) {
    const created = await prisma.paymentMethod.create({
      data: {
        name: body.name,
        type: body.type,
        instructions: body.instructions,
        accountDetails: body.accountDetails ?? {},
        network: body.network ?? null,
        minAmount: moneyString(d(body.minAmount ?? '50')),
        maxAmount: body.maxAmount ? moneyString(d(body.maxAmount)) : null,
        feePct: moneyString(d(body.feePct ?? '0'), 6),
        processingTime: body.processingTime ?? null,
        priority: body.priority ?? 100,
        isActive: body.isActive ?? true,
      },
    })
    await auditService.record({
      actorId,
      action: 'payment_method.create',
      module: 'finance',
      newValue: { id: created.id, name: created.name },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapPaymentMethod(created)
  },

  async update(
    actorId: string,
    id: string,
    body: Partial<{
      name: string
      instructions: string
      accountDetails: Record<string, string>
      network: string | null
      minAmount: string
      maxAmount: string | null
      feePct: string
      processingTime: string | null
      priority: number
      isActive: boolean
    }>,
    context: Ctx,
  ) {
    const existing = await prisma.paymentMethod.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Payment method not found.')

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.instructions !== undefined ? { instructions: body.instructions } : {}),
        ...(body.accountDetails !== undefined
          ? { accountDetails: body.accountDetails as Prisma.InputJsonValue }
          : {}),
        ...(body.network !== undefined ? { network: body.network } : {}),
        ...(body.minAmount !== undefined ? { minAmount: moneyString(d(body.minAmount)) } : {}),
        ...(body.maxAmount !== undefined
          ? { maxAmount: body.maxAmount ? moneyString(d(body.maxAmount)) : null }
          : {}),
        ...(body.feePct !== undefined ? { feePct: moneyString(d(body.feePct), 6) } : {}),
        ...(body.processingTime !== undefined ? { processingTime: body.processingTime } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    })
    await auditService.record({
      actorId,
      action: 'payment_method.update',
      module: 'finance',
      oldValue: { id, isActive: existing.isActive },
      newValue: { id, isActive: updated.isActive },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapPaymentMethod(updated)
  },

  async softDelete(actorId: string, id: string, context: Ctx) {
    const existing = await prisma.paymentMethod.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Payment method not found.')
    await prisma.paymentMethod.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
    await auditService.record({
      actorId,
      action: 'payment_method.delete',
      module: 'finance',
      oldValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { ok: true }
  },

  async setActive(actorId: string, id: string, isActive: boolean, context: Ctx) {
    if (typeof isActive !== 'boolean') throw badRequest('isActive is required.')
    return this.update(actorId, id, { isActive }, context)
  },
}
