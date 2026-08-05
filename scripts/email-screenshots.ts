/**
 * Capture PNG screenshots of rendered production email HTML.
 *   pnpm --filter @meridian/api exec node --import tsx ../../scripts/email-screenshots.ts
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from 'playwright'

import {
  PRODUCTION_EMAIL_TEMPLATES,
  renderEmailTemplate,
} from '../apps/api/src/emails/templates/index.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const previewDir = path.join(root, 'docs/qa/email-previews')
const shotDir = path.join(root, 'docs/qa/email-screenshots')

const FIXTURES: Record<string, Record<string, string>> = {
  'deposit-submitted': { firstName: 'Aisha', reference: 'DEP-TEST123', amount: '500.00 USD' },
  'deposit-approved': { firstName: 'Aisha', reference: 'DEP-TEST123', amount: '500.00 USD' },
  'deposit-rejected': {
    firstName: 'Aisha',
    reference: 'DEP-TEST123',
    amount: '500.00 USD',
    reason: 'UTR could not be verified',
  },
  'withdrawal-submitted': { firstName: 'Aisha', reference: 'WD-TEST456', amount: '200.00 USD' },
  'withdrawal-approved': { firstName: 'Aisha', reference: 'WD-TEST456', amount: '200.00 USD' },
  'withdrawal-rejected': {
    firstName: 'Aisha',
    reference: 'WD-TEST456',
    amount: '200.00 USD',
    reason: 'Destination details incomplete',
  },
  'kyc-submitted': { firstName: 'Aisha' },
  'kyc-approved': { firstName: 'Aisha' },
  'kyc-rejected': { firstName: 'Aisha', reason: 'Document image is blurry' },
  'support-reply': {
    firstName: 'Aisha',
    reference: 'TCK-AABB',
    subject: 'Deposit not credited',
    message: 'We are reviewing your UTR and will update you within one business day.',
  },
  'admin-alert': {
    alertTitle: 'Deposit submitted',
    alertBody: 'investor@example.com submitted deposit DEP-TEST123 for 500.00 USD.',
    reference: 'DEP-TEST123',
  },
  broadcast: {
    firstName: 'Aisha',
    title: 'Desk update',
    body: 'Markets were active today. Your portfolio continues to track published returns.',
  },
}

async function main() {
  mkdirSync(previewDir, { recursive: true })
  mkdirSync(shotDir, { recursive: true })

  for (const key of PRODUCTION_EMAIL_TEMPLATES) {
    const rendered = renderEmailTemplate(key, FIXTURES[key]!)
    writeFileSync(path.join(previewDir, `${key}.html`), rendered.html, 'utf8')
    writeFileSync(
      path.join(previewDir, `${key}.json`),
      JSON.stringify({ subject: rendered.subject }, null, 2),
      'utf8',
    )
  }

  const browser = await chromium.launch()
  const htmlFiles = readdirSync(previewDir).filter((f) => f.endsWith('.html'))

  for (const file of htmlFiles) {
    const name = file.replace(/\.html$/, '')
    const fileUrl = pathToFileURL(path.join(previewDir, file)).href
    for (const [label, width] of [
      ['desktop', 680],
      ['mobile', 390],
    ] as const) {
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
  console.log(`Previews → ${previewDir}`)
  console.log(`Screenshots → ${shotDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
