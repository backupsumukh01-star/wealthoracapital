/**
 * Responsive QA — checks key routes at multiple viewports for horizontal overflow,
 * sticky/fixed header geometry, splash dismissal, and chart presence.
 */
import { chromium } from 'playwright'

const BASE = process.env.QA_BASE_URL || 'http://localhost:3000'
const WIDTHS = [320, 360, 390, 430, 768, 1024, 1440]
const ROUTES = [
  '/',
  '/performance',
  '/our-trading-system',
  '/transparency',
  '/security',
  '/about',
  '/contact',
  '/faq',
  '/login',
]

const issues = []

function note(route, width, msg) {
  issues.push({ route, width, msg })
  console.log(`  ✗ [${width}px] ${route}: ${msg}`)
}

async function checkPage(page, route, width) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2200)

  // Splash must be gone
  const splash = await page.locator('[role="presentation"].fixed.inset-0').count()
  const splashZ = await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')]
    return els.some((el) => {
      const s = getComputedStyle(el)
      return (
        s.position === 'fixed' &&
        s.zIndex !== 'auto' &&
        Number(s.zIndex) >= 200 &&
        el.getBoundingClientRect().height > window.innerHeight * 0.8
      )
    })
  })
  if (splashZ) note(route, width, 'Splash/overlay still covering viewport after load')

  // Horizontal overflow
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth)
    const clientW = doc.clientWidth
    if (scrollW > clientW + 1) {
      const offenders = []
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width > clientW + 2 && r.left < 0) {
          offenders.push(el.tagName + '.' + (el.className?.toString?.().slice(0, 40) || ''))
        }
        if (r.right > clientW + 2) {
          const cls = (el.className?.toString?.() || '').slice(0, 48)
          if (cls && !cls.includes('sr-only')) offenders.push(`${el.tagName}.${cls}`)
        }
      }
      return { scrollW, clientW, offenders: [...new Set(offenders)].slice(0, 8) }
    }
    return null
  })
  if (overflow) {
    note(
      route,
      width,
      `Horizontal scroll (${overflow.scrollW}>${overflow.clientW}) e.g. ${overflow.offenders.join(' | ') || 'unknown'}`,
    )
  }

  // Header spacer / fixed header
  if (route === '/' || route.startsWith('/p') || route.startsWith('/a') || route.startsWith('/c') || route.startsWith('/f') || route.startsWith('/o') || route.startsWith('/t') || route.startsWith('/s')) {
    const headerOk = await page.evaluate((w) => {
      const header = document.querySelector('header.fixed, header')
      if (!header) return { ok: false, reason: 'no header' }
      const hr = header.getBoundingClientRect()
      const expected = w >= 1024 ? 72 : 68
      const heightOk = Math.abs(hr.height - expected) <= 2
      const topOk = Math.abs(hr.top) <= 1
      const spacer = document.querySelector('[data-header-spacer]')
      const spacerH = spacer ? spacer.getBoundingClientRect().height : 0
      const spacerOk = Math.abs(spacerH - expected) <= 2
      const main = document.querySelector('#main')
      const mainTop = main ? main.getBoundingClientRect().top : 0
      // main should be below header+gap+ticker roughly
      return {
        ok: heightOk && topOk && spacerOk && mainTop >= expected,
        height: hr.height,
        expected,
        spacerH,
        mainTop,
        heightOk,
        topOk,
        spacerOk,
      }
    }, width)
    if (!headerOk.ok) {
      note(
        route,
        width,
        `Header layout issue h=${headerOk.height?.toFixed?.(0)} expected=${headerOk.expected} spacer=${headerOk.spacerH?.toFixed?.(0)} mainTop=${headerOk.mainTop?.toFixed?.(0)}`,
      )
    }
  }

  // Homepage-specific
  if (route === '/') {
    const home = await page.evaluate(() => {
      const chart = document.querySelector('#performance svg, [aria-label*="performance"]')
      const ticker = document.querySelector('[aria-hidden] .marquee-track, .animate-marquee')
      const menuBtn = document.querySelector('button[aria-label*="menu" i], button[aria-label*="Menu" i]')
      return {
        hasChart: Boolean(chart),
        hasTicker: Boolean(ticker) || Boolean(document.body.innerText.includes('EUR/USD')),
        hasMenu: Boolean(menuBtn),
      }
    })
    if (!home.hasChart) note(route, width, 'Performance chart SVG missing')
    if (!home.hasTicker) note(route, width, 'Market ticker missing')

    // Open mobile menu below xl
    if (width < 1280) {
      const btn = page.locator('button[aria-label*="menu" i], button[aria-label*="Open menu" i]').first()
      if (await btn.count()) {
        await btn.click()
        await page.waitForTimeout(350)
        const open = await page.evaluate(() => {
          return Boolean(document.querySelector('[data-mobile-nav="open"]'))
        })
        if (!open) note(route, width, 'Mobile menu did not open')
        else {
          await page.keyboard.press('Escape')
          await page.waitForTimeout(450)
          const closed = await page.evaluate(() => {
            return !document.querySelector('[data-mobile-nav="open"]')
          })
          if (!closed) note(route, width, 'Mobile menu did not close on ESC')
        }
      } else {
        note(route, width, 'Hamburger button not found')
      }
    }
  }
}

async function main() {
  console.log(`QA against ${BASE}`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  // Fresh session so splash can run once then dismiss
  await context.clearCookies()
  const page = await context.newPage()

  // First load: verify splash dismisses
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2500)
  const splashGone = await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')]
    return !els.some((el) => {
      const s = getComputedStyle(el)
      return (
        s.position === 'fixed' &&
        Number(s.zIndex) >= 200 &&
        el.getBoundingClientRect().height > window.innerHeight * 0.8 &&
        Number(s.opacity) > 0.5
      )
    })
  })
  if (!splashGone) note('/', 390, 'Splash did not disappear within 2.5s')
  else console.log('  ✓ Splash dismissed')

  for (const width of WIDTHS) {
    console.log(`\n== ${width}px ==`)
    for (const route of ROUTES) {
      try {
        await checkPage(page, route, width)
        process.stdout.write(`  · ${route}\n`)
      } catch (e) {
        note(route, width, `Navigation/error: ${e.message}`)
      }
    }
  }

  await browser.close()

  console.log('\n========== SUMMARY ==========')
  if (issues.length === 0) {
    console.log('All checks passed.')
    process.exit(0)
  }
  console.log(`${issues.length} issue(s):`)
  for (const i of issues) console.log(`- [${i.width}] ${i.route}: ${i.msg}`)
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
