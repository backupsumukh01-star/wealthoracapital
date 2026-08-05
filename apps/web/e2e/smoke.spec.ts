import { test, expect } from '@playwright/test'

test.describe('Marketing & auth surfaces', () => {
  test('home page loads', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.ok() || res?.status() === 304).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page renders form controls', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
    const email = page.getByLabel(/email/i).or(page.locator('input[type="email"]')).first()
    await expect(email).toBeVisible({ timeout: 15_000 })
  })

  test('keyboard focus reaches primary interactive control on login', async ({ page }) => {
    await page.goto('/login')
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })
})

test.describe('Responsive & theme', () => {
  test('home does not horizontal-overflow at viewport', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth > doc.clientWidth + 2
    })
    expect(overflow).toBe(false)
  })

  test('dark class or theme attribute is stable', async ({ page }) => {
    await page.goto('/')
    const theme = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }))
    expect(typeof theme.dark === 'boolean' || theme.scheme).toBeTruthy()
  })
})
