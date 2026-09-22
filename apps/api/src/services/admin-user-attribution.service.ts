import { prisma } from '../database/prisma.js'
import { salesUsernameFromEmail } from './sales-privacy.js'

export type AdminReferredBySummary = {
  id: string
  name: string
  username: string
  referralCode: string | null
}

export type AdminUserAttribution = {
  referral: { referredBy: AdminReferredBySummary } | null
  salesman: { id: string; name: string; code: string } | null
}

const userAttributionSelect = {
  id: true,
  referredBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      referralCode: true,
    },
  },
  salesAttribution: {
    select: {
      salesman: {
        select: { id: true, name: true, code: true },
      },
    },
  },
} as const

type AttributionRow = {
  id: string
  referredBy: {
    id: string
    firstName: string
    lastName: string
    email: string
    referralCode: string | null
  } | null
  salesAttribution: {
    salesman: { id: string; name: string; code: string }
  } | null
}

function mapReferredBy(
  user: NonNullable<AttributionRow['referredBy']>,
): AdminReferredBySummary {
  const name = `${user.firstName} ${user.lastName}`.trim()
  return {
    id: user.id,
    name: name || user.email,
    username: salesUsernameFromEmail(user.email),
    referralCode: user.referralCode,
  }
}

function mapAttributionRow(row: AttributionRow): AdminUserAttribution {
  const salesman = row.salesAttribution?.salesman ?? null
  return {
    referral: row.referredBy ? { referredBy: mapReferredBy(row.referredBy) } : null,
    salesman: salesman
      ? { id: salesman.id, name: salesman.name, code: salesman.code }
      : null,
  }
}

const emptyAttribution: AdminUserAttribution = { referral: null, salesman: null }

export const adminUserAttributionService = {
  mapAttributionRow,

  async getForUserId(userId: string): Promise<AdminUserAttribution> {
    const map = await this.getForUserIds([userId])
    return map.get(userId) ?? emptyAttribution
  },

  async getForUserIds(userIds: string[]): Promise<Map<string, AdminUserAttribution>> {
    const unique = [...new Set(userIds.filter(Boolean))]
    if (unique.length === 0) {
      return new Map()
    }

    const rows = await prisma.user.findMany({
      where: { id: { in: unique } },
      select: userAttributionSelect,
    })

    return new Map(rows.map((row) => [row.id, mapAttributionRow(row)]))
  },
}
