import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { API_ROUTES, ROUTES } from './routes.js'

const SALES_WEB_DIR = fileURLToPath(
  new URL('../../../../apps/web/src/features/sales', import.meta.url),
)

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...walkTsFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

describe('Sales Portal routes', () => {
  it('keeps salesman pages off investor and admin namespaces', () => {
    expect(ROUTES.sales.login).toBe('/sales/login')
    expect(ROUTES.sales.dashboard).toBe('/sales/dashboard')
    expect(ROUTES.sales.login).not.toBe(ROUTES.auth.login)
    expect(ROUTES.sales.owner.root).not.toBe(ROUTES.admin.root)
  })

  it('points at Phase 5 salesman and owner network APIs', () => {
    expect(API_ROUTES.sales.auth.login).toBe('/sales/auth/login')
    expect(API_ROUTES.sales.me).toBe('/sales/me')
    expect(API_ROUTES.sales.meNetwork).toBe('/sales/me/network')
    expect(API_ROUTES.sales.meNetworkMembers).toBe('/sales/me/network/members')
    expect(API_ROUTES.sales.meNetworkSummary).toBe('/sales/me/network/summary')
    expect(API_ROUTES.sales.ownerSalesmen).toBe('/sales/owner/salesmen')
    expect(API_ROUTES.sales.ownerNetwork('abc')).toBe('/sales/owner/salesmen/abc/network')
    expect(API_ROUTES.sales.ownerNetworkMembers('abc')).toBe(
      '/sales/owner/salesmen/abc/network/members',
    )
    expect(API_ROUTES.sales.ownerNetworkSummary('abc')).toBe(
      '/sales/owner/salesmen/abc/network/summary',
    )
  })
})

describe('Sales Portal frontend financial safety', () => {
  it('does not recreate deposit/withdrawal totals in React', () => {
    const files = walkTsFiles(SALES_WEB_DIR)
    expect(files.length).toBeGreaterThan(0)
    const banned =
      /deposits\.reduce\s*\(|withdrawals\.reduce\s*\(|approvedDeposits\s*[+\-*]\s*|paidWithdrawals\s*[+\-*]\s*|netFunds\s*=\s*.*deposit/i
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(banned)
    }
  })
})
