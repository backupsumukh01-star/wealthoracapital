import { describe, expect, it } from 'vitest'

import {
  buildSalesNetworkForest,
  indirectMemberCount,
  salesReferralUrl,
} from './sales-network-tree.js'

describe('sales network tree (display only)', () => {
  it('nests descendants under attributed roots', () => {
    const forest = buildSalesNetworkForest([
      { userId: 'smit', parentUserId: null, level: 0 },
      { userId: 'amit', parentUserId: 'smit', level: 1 },
      { userId: 'harun', parentUserId: 'amit', level: 2 },
    ])
    expect(forest).toHaveLength(1)
    expect(forest[0]?.userId).toBe('smit')
    expect(forest[0]?.children[0]?.userId).toBe('amit')
    expect(forest[0]?.children[0]?.children[0]?.userId).toBe('harun')
  })

  it('keeps unknown parents as roots rather than inventing links', () => {
    const forest = buildSalesNetworkForest([
      { userId: 'a', parentUserId: 'missing', level: 0 },
    ])
    expect(forest[0]?.userId).toBe('a')
    expect(forest[0]?.children).toEqual([])
  })

  it('deduplicates member ids when building the forest', () => {
    const forest = buildSalesNetworkForest([
      { userId: 'a', parentUserId: null, level: 0 },
      { userId: 'b', parentUserId: 'a', level: 1 },
      { userId: 'b', parentUserId: 'a', level: 1 },
    ])
    expect(forest).toHaveLength(1)
    expect(forest[0]?.children).toHaveLength(1)
    expect(forest[0]?.children[0]?.userId).toBe('b')
  })
})

describe('sales display helpers', () => {
  it('derives indirect count from API summary fields only', () => {
    expect(indirectMemberCount({ totalMembers: 5, directMembers: 2 })).toBe(3)
    expect(indirectMemberCount({ totalMembers: 0, directMembers: 0 })).toBe(0)
  })

  it('builds a register URL from the configured site origin and API code', () => {
    expect(salesReferralUrl('https://example.test/', 'S1X8K2')).toBe(
      'https://example.test/register?ref=S1X8K2',
    )
  })
})
