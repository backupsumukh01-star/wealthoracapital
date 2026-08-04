import { prisma } from '../../database/prisma.js'
import { auditService } from '../audit.service.js'
import { badRequest, notFound } from '../../utils/errors.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function mapAddress(row: {
  id: string
  paymentMethodId: string | null
  label: string
  network: string
  address: string
  memo: string | null
  qrCodeKey: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    paymentMethodId: row.paymentMethodId,
    label: row.label,
    network: row.network,
    address: row.address,
    memo: row.memo,
    qrCodeKey: row.qrCodeKey,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const walletAddressService = {
  async list() {
    const rows = await prisma.walletAddress.findMany({
      where: { deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return rows.map(mapAddress)
  },

  async create(
    actorId: string,
    body: {
      paymentMethodId?: string
      label: string
      network: string
      address: string
      memo?: string
      qrCodeKey?: string
      isDefault?: boolean
      isActive?: boolean
    },
    context: Ctx,
  ) {
    if (!body.address?.trim()) throw badRequest('Address is required.')
    if (body.isDefault) {
      await prisma.walletAddress.updateMany({
        where: { network: body.network, deletedAt: null },
        data: { isDefault: false },
      })
    }
    const created = await prisma.walletAddress.create({
      data: {
        paymentMethodId: body.paymentMethodId ?? null,
        label: body.label,
        network: body.network,
        address: body.address.trim(),
        memo: body.memo ?? null,
        qrCodeKey: body.qrCodeKey ?? null,
        isDefault: body.isDefault ?? false,
        isActive: body.isActive ?? true,
      },
    })
    await auditService.record({
      actorId,
      action: 'wallet_address.create',
      module: 'finance',
      newValue: { id: created.id, network: created.network },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapAddress(created)
  },

  async update(
    actorId: string,
    id: string,
    body: Partial<{
      paymentMethodId: string | null
      label: string
      network: string
      address: string
      memo: string | null
      qrCodeKey: string | null
      isDefault: boolean
      isActive: boolean
    }>,
    context: Ctx,
  ) {
    const existing = await prisma.walletAddress.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Wallet address not found.')

    if (body.isDefault) {
      await prisma.walletAddress.updateMany({
        where: { network: body.network ?? existing.network, deletedAt: null, NOT: { id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.walletAddress.update({
      where: { id },
      data: {
        ...(body.paymentMethodId !== undefined ? { paymentMethodId: body.paymentMethodId } : {}),
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.network !== undefined ? { network: body.network } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.memo !== undefined ? { memo: body.memo } : {}),
        ...(body.qrCodeKey !== undefined ? { qrCodeKey: body.qrCodeKey } : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    })
    await auditService.record({
      actorId,
      action: 'wallet_address.update',
      module: 'finance',
      newValue: { id, isActive: updated.isActive, isDefault: updated.isDefault },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapAddress(updated)
  },

  async softDelete(actorId: string, id: string, context: Ctx) {
    const existing = await prisma.walletAddress.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Wallet address not found.')
    await prisma.walletAddress.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, isDefault: false },
    })
    await auditService.record({
      actorId,
      action: 'wallet_address.delete',
      module: 'finance',
      oldValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { ok: true }
  },
}
