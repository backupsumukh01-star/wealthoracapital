import type {
  PaymentMethod,
  PaymentMethodBankDetails,
  PaymentMethodUpiDetails,
  WalletAddress,
} from '@prisma/client'

import { storage } from '../storage/index.js'
import { moneyDisplay } from '../../utils/money.js'

export type PaymentMethodWithRelations = PaymentMethod & {
  upiDetails?: PaymentMethodUpiDetails | null
  bankDetails?: PaymentMethodBankDetails | null
  walletAddresses?: WalletAddress[]
}

function mediaUrl(key: string | null | undefined): string | null {
  if (!key?.trim()) return null
  try {
    return storage.createSignedDownloadUrl(key, 60 * 60 * 12)
  } catch {
    try {
      return storage.getPublicUrl(key)
    } catch {
      return null
    }
  }
}

function mapWallet(row: WalletAddress) {
  return {
    id: row.id,
    paymentMethodId: row.paymentMethodId,
    label: row.label,
    coin: row.coin,
    network: row.network,
    address: row.address,
    memo: row.memo,
    instructions: row.instructions,
    qrCodeKey: row.qrCodeKey,
    qrCodeUrl: mediaUrl(row.qrCodeKey),
    minAmount: row.minAmount ? moneyDisplay(row.minAmount) : null,
    maxAmount: row.maxAmount ? moneyDisplay(row.maxAmount) : null,
    sortOrder: row.sortOrder,
    isDefault: row.isDefault,
    isActive: row.isActive,
  }
}

function deriveAccountDetails(method: PaymentMethodWithRelations): Record<string, string> {
  const details: Record<string, string> = {}
  if (method.upiDetails) {
    details.upiId = method.upiDetails.upiId
    details.accountHolderName = method.upiDetails.accountHolderName
    if (method.upiDetails.qrCodeKey) details.qrCodeKey = method.upiDetails.qrCodeKey
  }
  if (method.bankDetails) {
    details.accountHolderName = method.bankDetails.accountHolderName
    details.accountName = method.bankDetails.accountHolderName
    details.bankName = method.bankDetails.bankName
    details.accountNumber = method.bankDetails.accountNumber
    details.ifsc = method.bankDetails.ifscCode
    details.ifscCode = method.bankDetails.ifscCode
    if (method.bankDetails.branch) details.branch = method.bankDetails.branch
    if (method.bankDetails.accountType) details.accountType = method.bankDetails.accountType
    if (method.bankDetails.qrCodeKey) details.qrCodeKey = method.bankDetails.qrCodeKey
  }
  const wallets = (method.walletAddresses ?? []).filter((w) => !w.deletedAt && w.isActive)
  const primary = wallets.find((w) => w.isDefault) ?? wallets[0]
  if (primary) {
    details.address = primary.address
    details.walletAddress = primary.address
    details.network = primary.network
    details.coin = primary.coin
    if (primary.memo) details.memo = primary.memo
    if (primary.qrCodeKey) details.qrCodeKey = primary.qrCodeKey
  } else if (method.network) {
    details.network = method.network
  }
  return details
}

export function mapPaymentMethodDetailed(
  method: PaymentMethodWithRelations,
  options?: { includeInactiveWallets?: boolean },
) {
  const wallets = (method.walletAddresses ?? [])
    .filter((w) => !w.deletedAt && (options?.includeInactiveWallets || w.isActive))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())

  return {
    id: method.id,
    name: method.name,
    type: method.type,
    instructions: method.instructions,
    accountDetails: deriveAccountDetails({ ...method, walletAddresses: wallets }),
    minAmount: moneyDisplay(method.minAmount),
    maxAmount: method.maxAmount ? moneyDisplay(method.maxAmount) : null,
    feePct: moneyDisplay(method.feePct),
    processingTime: method.processingTime,
    priority: method.priority,
    isActive: method.isActive,
    logoKey: method.logoKey,
    logoUrl: mediaUrl(method.logoKey),
    network: method.network,
    upi: method.upiDetails
      ? {
          upiId: method.upiDetails.upiId,
          accountHolderName: method.upiDetails.accountHolderName,
          qrCodeKey: method.upiDetails.qrCodeKey,
          qrCodeUrl: mediaUrl(method.upiDetails.qrCodeKey),
        }
      : null,
    bank: method.bankDetails
      ? {
          accountHolderName: method.bankDetails.accountHolderName,
          bankName: method.bankDetails.bankName,
          accountNumber: method.bankDetails.accountNumber,
          ifscCode: method.bankDetails.ifscCode,
          branch: method.bankDetails.branch,
          accountType: method.bankDetails.accountType,
          qrCodeKey: method.bankDetails.qrCodeKey,
          qrCodeUrl: mediaUrl(method.bankDetails.qrCodeKey),
        }
      : null,
    cryptoWallets: wallets.map(mapWallet),
  }
}

export { mapWallet, mediaUrl }
