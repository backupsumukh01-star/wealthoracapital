/**
 * Display-only hierarchy helpers for the Sales Portal.
 *
 * These functions rearrange server-provided member rows for the tree UI.
 * They must never add, subtract, or otherwise redefine financial totals —
 * money always comes from the API summary / per-member fields as-is.
 */

export type SalesNetworkNodeInput = {
  userId: string
  parentUserId: string | null
  level: number
}

export type SalesNetworkTreeNode<T extends SalesNetworkNodeInput> = T & {
  children: SalesNetworkTreeNode<T>[]
}

export function buildSalesNetworkForest<T extends SalesNetworkNodeInput>(
  members: readonly T[],
): SalesNetworkTreeNode<T>[] {
  const byId = new Map<string, SalesNetworkTreeNode<T>>()
  for (const member of members) {
    byId.set(member.userId, { ...member, children: [] })
  }

  const roots: SalesNetworkTreeNode<T>[] = []
  for (const node of byId.values()) {
    const parent = node.parentUserId ? byId.get(node.parentUserId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function sortNodes(nodes: SalesNetworkTreeNode<T>[]) {
    nodes.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.userId.localeCompare(b.userId)
    })
    for (const child of nodes) sortNodes(child.children)
  }

  sortNodes(roots)
  return roots
}

/** Presentation count from authoritative summary fields. Not a financial total. */
export function indirectMemberCount(summary: {
  totalMembers: number
  directMembers: number
}): number {
  return Math.max(0, summary.totalMembers - summary.directMembers)
}

export function salesReferralUrl(siteUrl: string, code: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  return `${base}/register?ref=${encodeURIComponent(code)}`
}
