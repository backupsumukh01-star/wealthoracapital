import { expect, test, type Page, type Route } from '@playwright/test'

const SALESMAN = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Alex Sales',
  email: 'alex.sales@example.test',
  code: 'S1X8K2',
  status: 'ACTIVE' as const,
  referralLink: 'http://localhost:3000/register?ref=S1X8K2',
}

const SUMMARY = {
  totalMembers: 3,
  directMembers: 1,
  maxDepth: 2,
  totalApprovedDeposits: '6000.00',
  totalPaidWithdrawals: '600.00',
  netFunds: '5400.00',
}

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

function ok(data: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    headers: CORS,
    body: JSON.stringify({ success: true, data }),
  }
}

async function fulfillApi(page: Page, pattern: RegExp, handler: (route: Route) => Promise<void>) {
  await page.route(pattern, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    await handler(route)
  })
}

async function mockSalesCsrf(page: Page) {
  await fulfillApi(page, /\/api\/v1\/csrf$/, async (route) => {
    await route.fulfill(ok({ csrfToken: 'test-csrf' }))
  })
}

async function grantSalesCookie(page: Page) {
  await page.context().addCookies([
    {
      name: 'wealthora_sales_at',
      value: 'phase6-ui-dummy',
      url: 'http://localhost:3000',
    },
  ])
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('growzy-logo-intro-v1', '1')
  })
})

test.describe('Sales Portal login', () => {
  test('renders email, password, and show/hide control', async ({ page }) => {
    await page.goto('/sales/login')
    await expect(page.getByRole('heading', { name: /sales portal/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /show password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('does not put tokens in page HTML or web storage', async ({ page }) => {
    await page.goto('/sales/login')
    await expect(page.getByRole('heading', { name: /sales portal/i })).toBeVisible()
    const html = await page.content()
    expect(html.toLowerCase()).not.toContain('wealthora_sales_at=')
    expect(html.toLowerCase()).not.toContain('access_token')
    const storage = await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }))
    expect(JSON.stringify(storage)).not.toMatch(/wealthora_sales_|mfx_at|accessToken|refreshToken/)
  })
})

test.describe('Sales Portal route protection', () => {
  test('logged-out /sales redirects to sales login, not investor login', async ({ page }) => {
    await page.goto('/sales/dashboard')
    await expect(page).toHaveURL(/\/sales\/login/)
    expect(new URL(page.url()).pathname).toBe('/sales/login')
    expect(new URL(page.url()).pathname).not.toBe('/login')
    await expect(page.getByRole('heading', { name: /sales portal/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('logged-out owner area redirects to admin login with next=/sales/owner', async ({
    page,
  }) => {
    await page.goto('/sales/owner')
    await expect(page).toHaveURL(/\/admin\/login/)
    expect(new URL(page.url()).searchParams.get('next')).toBe('/sales/owner')
  })

  test('salesman cookie cannot open owner pages', async ({ page }) => {
    await grantSalesCookie(page)
    await page.goto('/sales/owner')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('investor login remains at /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).not.toContain('/sales/login')
  })
})

test.describe('Salesman dashboard and network (mocked APIs)', () => {
  test('shows session loading state then API summary values', async ({ page }) => {
    await grantSalesCookie(page)
    await mockSalesCsrf(page)
    const requested: string[] = []

    await fulfillApi(page, /\/api\/v1\/sales\/me$/, async (route) => {
      requested.push(new URL(route.request().url()).pathname)
      await new Promise((resolve) => setTimeout(resolve, 400))
      await route.fulfill(ok({ salesman: SALESMAN }))
    })
    await fulfillApi(page, /\/api\/v1\/sales\/me\/network\/summary$/, async (route) => {
      requested.push(new URL(route.request().url()).pathname)
      await route.fulfill(ok({ salesman: SALESMAN, summary: SUMMARY }))
    })
    await fulfillApi(page, /\/api\/v1\/sales\/me\/network\/members$/, async (route) => {
      requested.push(new URL(route.request().url()).pathname)
      await route.fulfill(ok({ salesman: SALESMAN, members: [] }))
    })
    await fulfillApi(page, /\/api\/v1\/sales\/auth\/refresh$/, async (route) => {
      requested.push(new URL(route.request().url()).pathname)
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Refresh token missing.' },
        }),
      })
    })

    await page.goto('/sales/dashboard')
    await expect(page.getByText(/checking sales session/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Total Network Members')).toBeVisible()
    await expect(page.getByText('$6,000.00')).toBeVisible()
    await expect(page.getByText('$600.00')).toBeVisible()
    await expect(page.getByText('$5,400.00')).toBeVisible()
    expect(requested.some((path) => path.endsWith('/sales/me'))).toBeTruthy()
    expect(requested.some((path) => path.endsWith('/sales/me/network/summary'))).toBeTruthy()
    expect(requested.some((path) => path.includes('/auth/refresh') && !path.includes('/sales/'))).toBeFalsy()
  })

  test('shows API error state when summary fails', async ({ page }) => {
    await grantSalesCookie(page)
    await mockSalesCsrf(page)
    await fulfillApi(page, /\/api\/v1\/sales\/me$/, async (route) => {
      await route.fulfill(ok({ salesman: SALESMAN }))
    })
    await page.route(/\/api\/v1\/sales\/me\/network\/summary/, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS })
        return
      }
      await route.abort('failed')
    })

    await page.goto('/sales/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible({ timeout: 15_000 })
  })

  test('empty network uses members API without inventing rows', async ({ page }) => {
    await grantSalesCookie(page)
    await mockSalesCsrf(page)
    await fulfillApi(page, /\/api\/v1\/sales\/me$/, async (route) => {
      await route.fulfill(ok({ salesman: SALESMAN }))
    })
    await fulfillApi(page, /\/api\/v1\/sales\/me\/network\/summary$/, async (route) => {
      await route.fulfill(
        ok({
          salesman: SALESMAN,
          summary: {
            totalMembers: 0,
            directMembers: 0,
            maxDepth: 0,
            totalApprovedDeposits: '0.00',
            totalPaidWithdrawals: '0.00',
            netFunds: '0.00',
          },
        }),
      )
    })
    await fulfillApi(page, /\/api\/v1\/sales\/me\/network\/members$/, async (route) => {
      await route.fulfill(ok({ salesman: SALESMAN, members: [] }))
    })

    await page.goto('/sales/network')
    await expect(page.getByRole('heading', { name: 'My Network' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/no customers in this network yet/i)).toBeVisible()
  })

  test('renders hierarchy from member rows and API money fields', async ({ page }) => {
    await grantSalesCookie(page)
    await mockSalesCsrf(page)
    await fulfillApi(page, /\/api\/v1\/sales\/me$/, async (route) => {
      await route.fulfill(ok({ salesman: SALESMAN }))
    })
    await fulfillApi(page, /\/api\/v1\/sales\/me\/network\/summary$/, async (route) => {
      await route.fulfill(ok({ salesman: SALESMAN, summary: SUMMARY }))
    })
    await fulfillApi(page, /\/api\/v1\/sales\/me\/network\/members$/, async (route) => {
      await route.fulfill(
        ok({
          salesman: { id: SALESMAN.id, name: SALESMAN.name, code: SALESMAN.code, status: 'ACTIVE' },
          members: [
            {
              userId: 'smit',
              parentUserId: null,
              level: 0,
              isDirect: true,
              name: 'Smit',
              username: 'smit',
              referralCode: null,
              registrationDate: '2026-01-01T00:00:00.000Z',
              currentBalance: '6000.00',
              approvedDeposits: '6000.00',
              paidWithdrawals: '0.00',
              netFunds: '6000.00',
              directReferralCount: 1,
              networkMemberCount: 2,
            },
            {
              userId: 'amit',
              parentUserId: 'smit',
              level: 1,
              isDirect: false,
              name: 'Amit',
              username: 'amit',
              referralCode: null,
              registrationDate: '2026-02-01T00:00:00.000Z',
              currentBalance: '0.00',
              approvedDeposits: '0.00',
              paidWithdrawals: '0.00',
              netFunds: '0.00',
              directReferralCount: 1,
              networkMemberCount: 1,
            },
            {
              userId: 'harun',
              parentUserId: 'amit',
              level: 2,
              isDirect: false,
              name: 'Harun',
              username: 'harun',
              referralCode: null,
              registrationDate: '2026-03-01T00:00:00.000Z',
              currentBalance: '0.00',
              approvedDeposits: '0.00',
              paidWithdrawals: '600.00',
              netFunds: '-600.00',
              directReferralCount: 0,
              networkMemberCount: 0,
            },
          ],
        }),
      )
    })

    await page.goto('/sales/network')
    await expect(page.getByText('Smit', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Amit', { exact: true })).toBeVisible()
    await expect(page.getByText('Harun', { exact: true })).toBeVisible()
    await expect(page.getByText('$5,400.00')).toBeVisible()
  })
})

test.describe('Sales Portal empty and loading copy', () => {
  test('login form stays usable at 320px without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/sales/login')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 15_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    )
    expect(overflow).toBe(false)
  })

  for (const width of [375, 390, 414, 1280, 1440] as const) {
    test(`login remains readable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/sales/login')
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 15_000 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      )
      expect(overflow).toBe(false)
    })
  }
})
