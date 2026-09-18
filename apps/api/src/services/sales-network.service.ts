import { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { batchUserFinance } from './admin-users-finance.js'
import { d, moneyDisplay } from '../utils/money.js'
import { notFound } from '../utils/errors.js'

export type SalesNetworkSummary = {
  totalMembers: number
  directMembers: number
  maxDepth: number
  totalApprovedDeposits: string
  totalPaidWithdrawals: string
  netFunds: string
}

export type SalesNetworkMember = {
  userId: string
  parentUserId: string | null
  level: number
  isDirect: boolean
  name: string
  email: string
  referralCode: string | null
  registrationDate: string
  approvedDeposits: string
  paidWithdrawals: string
  netFunds: string
}

export type SalesNetworkResult = {
  salesman: { id: string; name: string; code: string; status: 'ACTIVE' | 'DISABLED' }
  summary: SalesNetworkSummary
  members: SalesNetworkMember[]
}

type CteRow = {
  user_id: string
  parent_user_id: string | null
  level: number | bigint
  is_direct: boolean
  path: string[] | unknown
}

const MAX_DEPTH = 32

function emptySummary(): SalesNetworkSummary {
  return {
    totalMembers: 0,
    directMembers: 0,
    maxDepth: 0,
    totalApprovedDeposits: moneyDisplay(0),
    totalPaidWithdrawals: moneyDisplay(0),
    netFunds: moneyDisplay(0),
  }
}

/**
 * Read-only salesman network.
 * Roots: SalesAttribution for this salesman only.
 * Descendants: User.referredById downward, excluding any other attributed roots.
 * Money: same as admin-users-finance (APPROVED creditedAmount??amount, PAID/COMPLETED netAmount??amount).
 */
export const salesNetworkService = {
  async listSalesmen() {
    const rows = await prisma.salesman.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, email: true, code: true, status: true, createdAt: true },
    })
    return {
      salesmen: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        code: row.code,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    }
  },

  async getNetwork(salesmanId: string): Promise<SalesNetworkResult> {
    const salesman = await prisma.salesman.findUnique({
      where: { id: salesmanId },
      select: { id: true, name: true, code: true, status: true },
    })
    if (!salesman) {
      throw notFound('Salesman not found.')
    }

    const cteRows = await prisma.$queryRaw<CteRow[]>(Prisma.sql`
      WITH RECURSIVE network AS (
        SELECT
          u.id AS user_id,
          NULL::uuid AS parent_user_id,
          0 AS level,
          TRUE AS is_direct,
          ARRAY[u.id]::uuid[] AS path
        FROM sales_attributions sa
        INNER JOIN users u ON u.id = sa.user_id
        WHERE sa.salesman_id = CAST(${salesmanId} AS uuid)
          AND u.deleted_at IS NULL

        UNION ALL

        SELECT
          child.id,
          child.referred_by_id,
          parent.level + 1,
          FALSE,
          parent.path || child.id
        FROM users child
        INNER JOIN network parent ON child.referred_by_id = parent.user_id
        WHERE child.deleted_at IS NULL
          AND parent.level < ${MAX_DEPTH}
          AND NOT child.id = ANY(parent.path)
          AND NOT EXISTS (
            SELECT 1 FROM sales_attributions other_root
            WHERE other_root.user_id = child.id
          )
      )
      SELECT user_id, parent_user_id, level, is_direct, path
      FROM (
        SELECT DISTINCT ON (user_id)
          user_id, parent_user_id, level, is_direct, path
        FROM network
        ORDER BY user_id, level ASC, path ASC
      ) ranked
      ORDER BY path ASC, level ASC, user_id ASC
    `)

    if (cteRows.length === 0) {
      return { salesman, summary: emptySummary(), members: [] }
    }

    const userIds = cteRows.map((row) => row.user_id)
    const [users, finance] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          referralCode: true,
          createdAt: true,
        },
      }),
      batchUserFinance(userIds),
    ])
    const userById = new Map(users.map((user) => [user.id, user]))

    const members: SalesNetworkMember[] = []
    let totalDeposits = d(0)
    let totalWithdrawals = d(0)
    let maxDepth = 0

    for (const row of cteRows) {
      const user = userById.get(row.user_id)
      if (!user) continue
      const level = Number(row.level)
      const snap = finance.get(user.id)
      const approvedDeposits = snap?.totalDeposited ?? moneyDisplay(0)
      const paidWithdrawals = snap?.totalWithdrawn ?? moneyDisplay(0)
      const net = d(approvedDeposits).minus(d(paidWithdrawals))
      totalDeposits = totalDeposits.plus(d(approvedDeposits))
      totalWithdrawals = totalWithdrawals.plus(d(paidWithdrawals))
      if (level > maxDepth) maxDepth = level
      members.push({
        userId: user.id,
        parentUserId: row.is_direct ? null : row.parent_user_id,
        level,
        isDirect: Boolean(row.is_direct) || level === 0,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        referralCode: user.referralCode,
        registrationDate: user.createdAt.toISOString(),
        approvedDeposits,
        paidWithdrawals,
        netFunds: moneyDisplay(net),
      })
    }

    const summary: SalesNetworkSummary = {
      totalMembers: members.length,
      directMembers: members.filter((member) => member.isDirect).length,
      maxDepth,
      totalApprovedDeposits: moneyDisplay(totalDeposits),
      totalPaidWithdrawals: moneyDisplay(totalWithdrawals),
      netFunds: moneyDisplay(totalDeposits.minus(totalWithdrawals)),
    }

    return { salesman, summary, members }
  },
}
