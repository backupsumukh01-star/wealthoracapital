/**
 * Screenshot already-rendered HTML in docs/qa/email-previews.
 *   node scripts/shot-email-previews.mjs
 */
import { mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const previewDir = path.join(root, 'docs/qa/email-previews')
const shotDir = path.join(root, 'docs/qa/email-screenshots')
mkdirSync(shotDir, { recursive: true })

const { chromium } = require(
  path.join(root, 'apps/api/node_modules/playwright'),
)

const browser = await chromium.launch()
const htmlFiles = readdirSync(previewDir).filter((f) => f.endsWith('.html'))

for (const file of htmlFiles) {
  const name = file.replace(/\.html$/, '')
  const fileUrl = pathToFileURL(path.join(previewDir, file)).href
  for (const [label, width] of [
    ['desktop', 680],
    ['mobile', 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(fileUrl)
    await page.screenshot({
      path: path.join(shotDir, `${name}-${label}.png`),
      fullPage: true,
    })
    await page.close()
    console.log(`shot ${name}-${label}.png`)
  }
}

await browser.close()
console.log(`Screenshots → ${shotDir}`)
