import { expect, test } from '@playwright/test'

test.describe('Homepage performance chart', () => {
  test('renders the canonical daily equity series', async ({ page }) => {
    const chartsPromise = page.waitForResponse(
      (res) => res.url().includes('/demo/backtest/charts.json') && res.ok(),
    )
    await page.goto('/')
    const chartsRes = await chartsPromise
    const charts = await chartsRes.json()
    expect(charts.meta.startDate).toBe('2022-09-01')
    expect(charts.meta.endDate).toBe('2026-08-05')
    expect(charts.meta.endingEquity).toBe(834.4)
    expect(charts.equityCurve.length).toBeGreaterThanOrEqual(1025)
    expect(charts.equityCurve.at(-1).date).toBe('2026-08-05')
    expect(charts.equityCurve.at(-1).equity).toBe(834.4)

    await expect(page.getByText('Growth of $100')).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible()
    await expect(page.locator('.recharts-area-area').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
    expect(overflow).toBe(false)
  })
})
