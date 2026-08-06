import { prisma } from '../../database/prisma.js'
import { auditService } from '../audit.service.js'
import { opsAlertService } from '../ops-alert.service.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { d, moneyString } from '../../utils/money.js'
import { mapWallet } from './payment-method.mapper.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

export type WalletWriteBody = {
  paymentMethodId?: string | null
  label: string
  coin?: string
  network: string
  address: string
  memo?: string | null
  instructions?: string | null
  qrCodeKey?: string | null
  minAmount?: string | null
  maxAmount?: string | null
  sortOrder?: number
  isDefault?: boolean
  isActive?: boolean
}

export const walletAddressService = {
  async list(paymentMethodId?: string) {
    const rows = await prisma.walletAddress.findMany({
      where: {
        deletedAt: null,
        ...(paymentMethodId ? { paymentMethodId } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return rows.map(mapWallet)
  },

  async create(actorId: string, body: WalletWriteBody, context: Ctx) {
    if (!body.address?.trim()) throw badRequest('Address is required.')
    if (!body.paymentMethodId) throw badRequest('paymentMethodId is required.')
    if (!body.coin?.trim()) throw badRequest('Coin is required.')

    const method = await prisma.paymentMethod.findFirst({
      where: { id: body.paymentMethodId, deletedAt: null },
    })
    if (!method) throw notFound('Payment method not found.')

    if (body.isDefault) {
      await prisma.walletAddress.updateMany({
        where: { paymentMethodId: body.paymentMethodId, deletedAt: null },
        data: { isDefault: false },
      })
    }

    const created = await prisma.walletAddress.create({
      data: {
        paymentMethodId: body.paymentMethodId,
        label: body.label.trim(),
        coin: body.coin.trim().toUpperCase(),
        network: body.network.trim().toUpperCase(),
        address: body.address.trim(),
        memo: body.memo?.trim() || null,
        instructions: body.instructions?.trim() || null,
        qrCodeKey: body.qrCodeKey ?? null,
        minAmount: body.minAmount ? moneyString(d(body.minAmount)) : null,
        maxAmount: body.maxAmount ? moneyString(d(body.maxAmount)) : null,
        sortOrder: body.sortOrder ?? 100,
        isDefault: body.isDefault ?? false,
        isActive: body.isActive ?? true,
      },
    })
    await auditService.record({
      actorId,
      action: 'wallet_address.create',
      module: 'finance',
      newValue: { id: created.id, coin: created.coin, network: created.network },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await opsAlertService.notify({
      event: 'WALLET_ADDRESS_CHANGED',
      title: 'Wallet address created',
      action: `Crypto wallet ${created.label} added`,
      reference: created.id,
      ip: context.ip,
      adminPath: `/admin/deposit-methods`,
      details: {
        Coin: created.coin,
        Network: created.network,
        Address: created.address.slice(0, 16) + '…',
      },
    })
    return mapWallet(created)
  },

  async update(
    actorId: string,
    id: string,
    body: Partial<WalletWriteBody>,
    context: Ctx,
  ) {
    const existing = await prisma.walletAddress.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Wallet address not found.')

    const methodId = body.paymentMethodId === undefined ? existing.paymentMethodId : body.paymentMethodId
    if (body.isDefault && methodId) {
      await prisma.walletAddress.updateMany({
        where: { paymentMethodId: methodId, deletedAt: null, NOT: { id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.walletAddress.update({
      where: { id },
      data: {
        ...(body.paymentMethodId !== undefined ? { paymentMethodId: body.paymentMethodId } : {}),
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.coin !== undefined ? { coin: body.coin.trim().toUpperCase() } : {}),
        ...(body.network !== undefined ? { network: body.network.trim().toUpperCase() } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.memo !== undefined ? { memo: body.memo } : {}),
        ...(body.instructions !== undefined ? { instructions: body.instructions } : {}),
        ...(body.qrCodeKey !== undefined ? { qrCodeKey: body.qrCodeKey } : {}),
        ...(body.minAmount !== undefined
          ? { minAmount: body.minAmount ? moneyString(d(body.minAmount)) : null }
          : {}),
        ...(body.maxAmount !== undefined
          ? { maxAmount: body.maxAmount ? moneyString(d(body.maxAmount)) : null }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
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
    await opsAlertService.notify({
      event: 'WALLET_ADDRESS_CHANGED',
      title: 'Wallet address updated',
      action: `Crypto wallet ${updated.label} updated`,
      reference: id,
      ip: context.ip,
      adminPath: `/admin/deposit-methods`,
      details: {
        Coin: updated.coin,
        Network: updated.network,
        Active: String(updated.isActive),
      },
    })
    return mapWallet(updated)
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
