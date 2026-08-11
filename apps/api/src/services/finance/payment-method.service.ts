import type { PaymentMethodType, Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { auditService } from '../audit.service.js'
import { opsAlertService } from '../ops-alert.service.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { d, moneyString } from '../../utils/money.js'
import { mapPaymentMethodDetailed } from './payment-method.mapper.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const CANONICAL_TYPES = new Set(['UPI', 'BANK_TRANSFER', 'CRYPTO', 'MANUAL', 'OTHER'])

export type UpiInput = {
  upiId: string
  accountHolderName: string
  qrCodeKey?: string | null
}

export type BankInput = {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branch?: string | null
  accountType?: string | null
  qrCodeKey?: string | null
}

export type CryptoWalletInput = {
  id?: string
  label: string
  coin: string
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

export type PaymentMethodWriteInput = {
  name: string
  type: PaymentMethodType
  instructions: string
  logoKey?: string | null
  network?: string | null
  minAmount?: string
  maxAmount?: string | null
  feePct?: string
  processingTime?: string | null
  priority?: number
  isActive?: boolean
  upi?: UpiInput | null
  bank?: BankInput | null
  cryptoWallets?: CryptoWalletInput[]
}

const methodInclude = {
  upiDetails: true,
  bankDetails: true,
  walletAddresses: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.PaymentMethodInclude

function assertTypePayload(type: PaymentMethodType, body: PaymentMethodWriteInput | Partial<PaymentMethodWriteInput>) {
  if (type === 'UPI' && body.upi !== undefined && body.upi !== null) {
    if (!body.upi.upiId?.trim() || !body.upi.accountHolderName?.trim()) {
      throw badRequest('UPI ID and account holder name are required.')
    }
  }
  if (type === 'BANK_TRANSFER' && body.bank !== undefined && body.bank !== null) {
    if (
      !body.bank.accountHolderName?.trim() ||
      !body.bank.bankName?.trim() ||
      !body.bank.accountNumber?.trim() ||
      !body.bank.ifscCode?.trim()
    ) {
      throw badRequest('Bank holder, bank name, account number, and IFSC are required.')
    }
  }
  if (type === 'CRYPTO' && body.cryptoWallets) {
    for (const wallet of body.cryptoWallets) {
      if (!wallet.coin?.trim() || !wallet.network?.trim() || !wallet.address?.trim() || !wallet.label?.trim()) {
        throw badRequest('Each crypto wallet needs label, coin, network, and address.')
      }
    }
  }
}

export const paymentMethodService = {
  async adminList(includeInactive = true) {
    const methods = await prisma.paymentMethod.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: methodInclude,
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })
    return methods.map((m) => mapPaymentMethodDetailed(m, { includeInactiveWallets: true }))
  },

  async listEnabledForInvestor() {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        upiDetails: true,
        bankDetails: true,
        walletAddresses: {
          where: { isActive: true, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })

    return methods
      .map((m) => mapPaymentMethodDetailed(m))
      .filter((m) => {
        if (m.type === 'CRYPTO' || m.type === 'USDT_TRC20' || m.type === 'USDT_BEP20' || m.type === 'BTC' || m.type === 'ETH') {
          return m.cryptoWallets.length > 0
        }
        return true
      })
  },

  async getById(id: string, opts?: { admin?: boolean }) {
    const method = await prisma.paymentMethod.findFirst({
      where: { id, deletedAt: null, ...(opts?.admin ? {} : { isActive: true }) },
      include: methodInclude,
    })
    if (!method) throw notFound('Payment method not found.')
    return mapPaymentMethodDetailed(method, { includeInactiveWallets: Boolean(opts?.admin) })
  },

  async create(actorId: string, body: PaymentMethodWriteInput, context: Ctx) {
    if (!CANONICAL_TYPES.has(body.type) && body.type !== 'MOBILE_WALLET') {
      // Allow legacy only if explicitly needed; prefer canonical.
    }
    if (body.type === 'UPI' && !body.upi) throw badRequest('UPI details are required.')
    if (body.type === 'BANK_TRANSFER' && !body.bank) throw badRequest('Bank details are required.')
    if (body.type === 'CRYPTO' && (!body.cryptoWallets || body.cryptoWallets.length === 0)) {
      throw badRequest('At least one crypto wallet is required.')
    }
    assertTypePayload(body.type, body)

    const created = await prisma.$transaction(async (tx) => {
      const method = await tx.paymentMethod.create({
        data: {
          name: body.name.trim(),
          type: body.type,
          instructions: body.instructions.trim(),
          accountDetails: {},
          network: body.network ?? null,
          logoKey: body.logoKey ?? null,
          minAmount: moneyString(d(body.minAmount ?? '1')),
          maxAmount: body.maxAmount ? moneyString(d(body.maxAmount)) : null,
          feePct: moneyString(d(body.feePct ?? '0'), 6),
          processingTime: body.processingTime ?? null,
          priority: body.priority ?? 100,
          isActive: body.isActive ?? true,
        },
      })

      if (body.type === 'UPI' && body.upi) {
        await tx.paymentMethodUpiDetails.create({
          data: {
            paymentMethodId: method.id,
            upiId: body.upi.upiId.trim(),
            accountHolderName: body.upi.accountHolderName.trim(),
            qrCodeKey: body.upi.qrCodeKey ?? null,
          },
        })
      }

      if (body.type === 'BANK_TRANSFER' && body.bank) {
        await tx.paymentMethodBankDetails.create({
          data: {
            paymentMethodId: method.id,
            accountHolderName: body.bank.accountHolderName.trim(),
            bankName: body.bank.bankName.trim(),
            accountNumber: body.bank.accountNumber.trim(),
            ifscCode: body.bank.ifscCode.trim().toUpperCase(),
            branch: body.bank.branch?.trim() || null,
            accountType: body.bank.accountType?.trim() || null,
            qrCodeKey: body.bank.qrCodeKey ?? null,
          },
        })
      }

      if (body.type === 'CRYPTO' && body.cryptoWallets?.length) {
        let sort = 100
        for (const wallet of body.cryptoWallets) {
          await tx.walletAddress.create({
            data: {
              paymentMethodId: method.id,
              label: wallet.label.trim(),
              coin: wallet.coin.trim().toUpperCase(),
              network: wallet.network.trim().toUpperCase(),
              address: wallet.address.trim(),
              memo: wallet.memo?.trim() || null,
              instructions: wallet.instructions?.trim() || null,
              qrCodeKey: wallet.qrCodeKey ?? null,
              minAmount: wallet.minAmount ? moneyString(d(wallet.minAmount)) : null,
              maxAmount: wallet.maxAmount ? moneyString(d(wallet.maxAmount)) : null,
              sortOrder: wallet.sortOrder ?? sort,
              isDefault: wallet.isDefault ?? false,
              isActive: wallet.isActive ?? true,
            },
          })
          sort += 10
        }
      }

      return tx.paymentMethod.findUniqueOrThrow({
        where: { id: method.id },
        include: methodInclude,
      })
    })

    await auditService.record({
      actorId,
      action: 'payment_method.create',
      module: 'finance',
      newValue: { id: created.id, name: created.name, type: created.type },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await opsAlertService.notify({
      event: 'PAYMENT_METHOD_CHANGED',
      title: 'Payment method created',
      action: `Payment method "${created.name}" created`,
      reference: created.id,
      ip: context.ip,
      adminPath: `/admin/deposit-methods`,
      details: { Type: created.type, Name: created.name },
    })
    return mapPaymentMethodDetailed(created, { includeInactiveWallets: true })
  },

  async update(
    actorId: string,
    id: string,
    body: Partial<PaymentMethodWriteInput>,
    context: Ctx,
  ) {
    const existing = await prisma.paymentMethod.findFirst({
      where: { id, deletedAt: null },
      include: methodInclude,
    })
    if (!existing) throw notFound('Payment method not found.')

    assertTypePayload(existing.type, body)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentMethod.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.instructions !== undefined ? { instructions: body.instructions.trim() } : {}),
          ...(body.logoKey !== undefined ? { logoKey: body.logoKey } : {}),
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

      if (body.upi !== undefined) {
        if (body.upi === null) {
          await tx.paymentMethodUpiDetails.deleteMany({ where: { paymentMethodId: id } })
        } else {
          await tx.paymentMethodUpiDetails.upsert({
            where: { paymentMethodId: id },
            create: {
              paymentMethodId: id,
              upiId: body.upi.upiId.trim(),
              accountHolderName: body.upi.accountHolderName.trim(),
              qrCodeKey: body.upi.qrCodeKey ?? null,
            },
            update: {
              upiId: body.upi.upiId.trim(),
              accountHolderName: body.upi.accountHolderName.trim(),
              qrCodeKey: body.upi.qrCodeKey ?? null,
            },
          })
        }
      }

      if (body.bank !== undefined) {
        if (body.bank === null) {
          await tx.paymentMethodBankDetails.deleteMany({ where: { paymentMethodId: id } })
        } else {
          await tx.paymentMethodBankDetails.upsert({
            where: { paymentMethodId: id },
            create: {
              paymentMethodId: id,
              accountHolderName: body.bank.accountHolderName.trim(),
              bankName: body.bank.bankName.trim(),
              accountNumber: body.bank.accountNumber.trim(),
              ifscCode: body.bank.ifscCode.trim().toUpperCase(),
              branch: body.bank.branch?.trim() || null,
              accountType: body.bank.accountType?.trim() || null,
              qrCodeKey: body.bank.qrCodeKey ?? null,
            },
            update: {
              accountHolderName: body.bank.accountHolderName.trim(),
              bankName: body.bank.bankName.trim(),
              accountNumber: body.bank.accountNumber.trim(),
              ifscCode: body.bank.ifscCode.trim().toUpperCase(),
              branch: body.bank.branch?.trim() || null,
              accountType: body.bank.accountType?.trim() || null,
              qrCodeKey: body.bank.qrCodeKey ?? null,
            },
          })
        }
      }

      if (body.cryptoWallets !== undefined) {
        // Soft-delete wallets not present in the replacement set when full array is sent.
        const keepIds: string[] = []
        let sort = 100
        for (const wallet of body.cryptoWallets) {
          const data = {
            paymentMethodId: id,
            label: wallet.label.trim(),
            coin: wallet.coin.trim().toUpperCase(),
            network: wallet.network.trim().toUpperCase(),
            address: wallet.address.trim(),
            memo: wallet.memo?.trim() || null,
            instructions: wallet.instructions?.trim() || null,
            qrCodeKey: wallet.qrCodeKey ?? null,
            minAmount: wallet.minAmount ? moneyString(d(wallet.minAmount)) : null,
            maxAmount: wallet.maxAmount ? moneyString(d(wallet.maxAmount)) : null,
            sortOrder: wallet.sortOrder ?? sort,
            isDefault: wallet.isDefault ?? false,
            isActive: wallet.isActive ?? true,
            deletedAt: null,
          }
          const existingId = wallet.id
          if (existingId) {
            await tx.walletAddress.update({
              where: { id: existingId },
              data,
            })
            keepIds.push(existingId)
          } else {
            const created = await tx.walletAddress.create({ data })
            keepIds.push(created.id)
          }
          sort += 10
        }
        await tx.walletAddress.updateMany({
          where: {
            paymentMethodId: id,
            deletedAt: null,
            ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
          },
          data: { deletedAt: new Date(), isActive: false, isDefault: false },
        })
      }

      return tx.paymentMethod.findUniqueOrThrow({
        where: { id },
        include: methodInclude,
      })
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
    await opsAlertService.notify({
      event: 'PAYMENT_METHOD_CHANGED',
      title: 'Payment method updated',
      action: `Payment method "${updated.name}" updated`,
      reference: id,
      ip: context.ip,
      adminPath: `/admin/deposit-methods`,
      details: { Type: updated.type, Name: updated.name, Active: String(updated.isActive) },
    })
    return mapPaymentMethodDetailed(updated, { includeInactiveWallets: true })
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

  async reorder(actorId: string, orderedIds: string[], context: Ctx) {
    if (!orderedIds.length) throw badRequest('orderedIds is required.')
    const unique = [...new Set(orderedIds)]
    if (unique.length !== orderedIds.length) throw badRequest('Duplicate method ids in reorder.')

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.paymentMethod.updateMany({
          where: { id, deletedAt: null },
          data: { priority: (index + 1) * 10 },
        }),
      ),
    )

    await auditService.record({
      actorId,
      action: 'payment_method.reorder',
      module: 'finance',
      newValue: { orderedIds },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.adminList(true)
  },
}
