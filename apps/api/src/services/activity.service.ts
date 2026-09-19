import type { ActivityKind, Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { activityRepository } from '../repositories/activity.repository.js'
import { moneyDisplay } from '../utils/money.js'

export type ActivityCategory = 'deposits' | 'withdrawals' | 'kyc' | 'profit' | 'security'

function amountFromMeta(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const amount = (metadata as { amount?: unknown }).amount
  return typeof amount === 'string' && amount.trim() ? amount.trim() : null
}

function alreadyHasAmount(description: string) {
  return /^\d+(\.\d+)?\s*·/.test(description) || /^Profit\s+/i.test(description)
}

async function withMoneyDescriptions<
  T extends { kind: string; description: string | null; metadata: unknown },
>(userId: string, items: T[]): Promise<T[]> {
  const refs = [
    ...new Set(
      items
        .filter(
          (item) =>
            item.description &&
            !alreadyHasAmount(item.description) &&
            (item.kind.startsWith('DEPOSIT_') || item.kind.startsWith('WITHDRAWAL_')),
        )
        .map((item) => item.description!),
    ),
  ]
  const amountByRef = new Map<string, string>()
  if (refs.length > 0) {
    const [deposits, withdrawals] = await Promise.all([
      prisma.deposit.findMany({
        where: { userId, reference: { in: refs } },
        select: { reference: true, creditedAmount: true, amount: true },
      }),
      prisma.withdrawal.findMany({
        where: { userId, reference: { in: refs } },
        select: { reference: true, amount: true },
      }),
    ])
    for (const row of deposits) {
      amountByRef.set(row.reference, moneyDisplay(row.creditedAmount ?? row.amount))
    }
    for (const row of withdrawals) {
      amountByRef.set(row.reference, moneyDisplay(row.amount))
    }
  }

  return items.map((item) => {
    if (item.description && alreadyHasAmount(item.description)) return item
    const amount = amountFromMeta(item.metadata) ?? (item.description ? amountByRef.get(item.description) : undefined)
    if (!amount) return item
    return {
      ...item,
      description: item.description ? `${amount} · ${item.description}` : amount,
    }
  })
}

const CATEGORY_KINDS: Record<ActivityCategory, ActivityKind[]> = {
  deposits: ['DEPOSIT_SUBMITTED', 'DEPOSIT_APPROVED', 'DEPOSIT_REJECTED', 'DEPOSIT_CANCELLED'],
  withdrawals: [
    'WITHDRAWAL_SUBMITTED',
    'WITHDRAWAL_APPROVED',
    'WITHDRAWAL_REJECTED',
    'WITHDRAWAL_CANCELLED',
    'WITHDRAWAL_PAID',
  ],
  kyc: [
    'KYC_SUBMITTED',
    'KYC_APPROVED',
    'KYC_REJECTED',
    'KYC_INFO_REQUESTED',
    'KYC_EXPIRED',
    'KYC_SUSPENDED',
    'KYC_REOPENED',
  ],
  profit: [
    'DAILY_RETURN_APPLIED',
    'DISTRIBUTION_COMPLETE',
    'TRADE_OPENED',
    'TRADE_CLOSED',
    'TRADE_PUBLISHED',
    'WALLET_ADJUSTMENT',
  ],
  security: [
    'LOGIN',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'EMAIL_CHANGE',
    'SESSION_TERMINATED',
    'REGISTRATION',
    'PROFILE_UPDATE',
  ],
}

export const activityService = {
  async record(input: {
    userId: string
    actorId?: string | null
    kind: ActivityKind
    title: string
    description?: string | null
    metadata?: Record<string, unknown>
    ip?: string | null
    userAgent?: string | null
    createdAt?: Date
  }): Promise<void> {
    await activityRepository.create({
      user: { connect: { id: input.userId } },
      ...(input.actorId ? { actor: { connect: { id: input.actorId } } } : {}),
      kind: input.kind,
      title: input.title,
      description: input.description ?? null,
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      ip: input.ip ?? null,
      userAgent: input.userAgent?.slice(0, 400) ?? null,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
  },

  async list(input: {
    userId?: string
    kind?: ActivityKind
    category?: ActivityCategory
    page: number
    limit: number
    cursor?: string
    sortOrder: 'asc' | 'desc'
  }) {
    const where: Prisma.ActivityLogWhereInput = {
      ...(input.userId
        ? { userId: input.userId }
        : { user: { createdByAdminId: null } }),
      ...(input.category
        ? { kind: { in: CATEGORY_KINDS[input.category] } }
        : input.kind
          ? { kind: input.kind }
          : {}),
    }
    const skip = (input.page - 1) * input.limit
    const { items, total } = await activityRepository.list({
      where,
      skip,
      take: input.limit,
      cursor: input.cursor,
      sortOrder: input.sortOrder,
    })

    const mapped = items.map((item) => ({
      id: item.id,
      userId: item.userId,
      actorId: item.actorId,
      kind: item.kind,
      title: item.title,
      description: item.description,
      metadata: item.metadata,
      ip: item.ip,
      at: item.createdAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }))
    const withAmounts = input.userId ? await withMoneyDescriptions(input.userId, mapped) : mapped

    return {
      items: withAmounts,
      nextCursor: mapped.length === input.limit ? mapped[mapped.length - 1]?.id ?? null : null,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        hasNext: skip + mapped.length < total,
      },
    }
  },
}
