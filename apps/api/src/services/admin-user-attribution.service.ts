import { prisma } from '../database/prisma.js'
import { salesUsernameFromEmail } from './sales-privacy.js'

/** Match Sales Portal network depth bound. */
export const ADMIN_ATTRIBUTION_MAX_CHAIN_DEPTH = 32

export type AdminReferredBySummary = {
  id: string
  name: string
  username: string
  referralCode: string | null
}

export type AdminSalesmanSummary = {
  id: string
  name: string
  code: string
}

export type AdminUserAttribution = {
  referral: { referredBy: AdminReferredBySummary } | null
  salesman: AdminSalesmanSummary | null
}

type ChainNode = {
  id: string
  referredById: string | null
  referredBy: {
    id: string
    firstName: string
    lastName: string
    email: string
    referralCode: string | null
  } | null
  salesman: AdminSalesmanSummary | null
}

type AttributionRow = {
  id: string
  referredBy: ChainNode['referredBy']
  salesAttribution: {
    salesman: AdminSalesmanSummary
  } | null
}

const chainNodeSelect = {
  id: true,
  referredById: true,
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

function mapReferredBy(
  user: NonNullable<ChainNode['referredBy']>,
): AdminReferredBySummary {
  const name = `${user.firstName} ${user.lastName}`.trim()
  return {
    id: user.id,
    name: name || user.email,
    username: salesUsernameFromEmail(user.email),
    referralCode: user.referralCode,
  }
}

function toChainNode(row: {
  id: string
  referredById: string | null
  referredBy: ChainNode['referredBy']
  salesAttribution: { salesman: AdminSalesmanSummary } | null
}): ChainNode {
  return {
    id: row.id,
    referredById: row.referredById,
    referredBy: row.referredBy,
    salesman: row.salesAttribution?.salesman ?? null,
  }
}

/**
 * Walk upward from startUserId through referredById until a salesman is found.
 * Direct SalesAttribution on an ancestor (or the start user) wins; cycles and
 * depth limits terminate safely with null.
 */
export function resolveInheritedSalesman(
  startUserId: string,
  nodes: Map<string, Pick<ChainNode, 'referredById' | 'salesman'>>,
  maxDepth = ADMIN_ATTRIBUTION_MAX_CHAIN_DEPTH,
): AdminSalesmanSummary | null {
  const visited = new Set<string>()
  let currentId: string | null = startUserId
  let depth = 0

  while (currentId && depth <= maxDepth) {
    if (visited.has(currentId)) {
      return null
    }
    visited.add(currentId)

    const node = nodes.get(currentId)
    if (!node) {
      return null
    }
    if (node.salesman) {
      return node.salesman
    }
    currentId = node.referredById
    depth += 1
  }

  return null
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

async function loadChainNodes(userIds: string[]): Promise<Map<string, ChainNode>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) {
    return new Map()
  }

  const rows = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: chainNodeSelect,
  })

  return new Map(rows.map((row) => [row.id, toChainNode(row)]))
}

/**
 * Ensure ancestors needed for salesman inheritance are loaded into `cache`.
 * Batches missing parents instead of one query per hop.
 */
async function ensureAncestorChain(
  rootIds: string[],
  cache: Map<string, ChainNode>,
): Promise<void> {
  for (let hop = 0; hop < ADMIN_ATTRIBUTION_MAX_CHAIN_DEPTH; hop += 1) {
    const toFetch = new Set<string>()

    for (const rootId of rootIds) {
      const pathVisited = new Set<string>()
      let currentId: string | null = rootId

      for (let depth = 0; depth <= ADMIN_ATTRIBUTION_MAX_CHAIN_DEPTH && currentId; depth += 1) {
        if (pathVisited.has(currentId)) break
        pathVisited.add(currentId)

        const node = cache.get(currentId)
        if (!node) {
          toFetch.add(currentId)
          break
        }
        if (node.salesman) break
        if (!node.referredById) break

        currentId = node.referredById
        if (!cache.has(currentId)) {
          toFetch.add(currentId)
          break
        }
      }
    }

    if (toFetch.size === 0) return

    const loaded = await loadChainNodes([...toFetch])
    for (const [id, node] of loaded) {
      cache.set(id, node)
    }

    // Parent IDs that do not exist in the DB cannot be progressed; stop if nothing new loaded.
    if (loaded.size === 0) return
  }
}

export const adminUserAttributionService = {
  mapAttributionRow,
  resolveInheritedSalesman,

  async getForUserId(userId: string): Promise<AdminUserAttribution> {
    const map = await this.getForUserIds([userId])
    return map.get(userId) ?? emptyAttribution
  },

  async getForUserIds(userIds: string[]): Promise<Map<string, AdminUserAttribution>> {
    const unique = [...new Set(userIds.filter(Boolean))]
    if (unique.length === 0) {
      return new Map()
    }

    const cache = await loadChainNodes(unique)
    const needsAncestors = unique.filter((id) => {
      const node = cache.get(id)
      return Boolean(node && !node.salesman && node.referredById)
    })

    if (needsAncestors.length > 0) {
      await ensureAncestorChain(needsAncestors, cache)
    }

    const result = new Map<string, AdminUserAttribution>()
    for (const id of unique) {
      const node = cache.get(id)
      if (!node) {
        result.set(id, emptyAttribution)
        continue
      }
      result.set(id, {
        referral: node.referredBy ? { referredBy: mapReferredBy(node.referredBy) } : null,
        salesman: resolveInheritedSalesman(id, cache),
      })
    }
    return result
  },
}
