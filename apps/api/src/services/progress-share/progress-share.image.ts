import { Resvg } from '@resvg/resvg-js'
import {
  currencyDecimals,
  formatMoney,
  formatPercent,
  type DisplayCurrency,
} from '@meridian/shared'

import type { ProgressShareSnapshot } from './progress-share.types.js'

/**
 * Server-side PNG renderer for branded progress share cards.
 * Dependency: `@resvg/resvg-js` (SVG → PNG; mature native binding used in Node production).
 *
 * Canvas is content-tight (1080×780) so messengers show the graphic edge-to-edge
 * without large unused letterbox regions inside the PNG itself.
 */

export const PROGRESS_SHARE_SIZE = { width: 1080, height: 780 } as const

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateName(name: string, max = 26): string {
  const trimmed = name.trim() || 'Investor'
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function moneyLabel(amount: string, currency: DisplayCurrency): string {
  return formatMoney(amount, {
    currency,
    decimals: currencyDecimals(currency),
  })
}

/** Build the SVG markup (exported for unit tests without PNG encoding). */
export function buildProgressShareSvg(snapshot: ProgressShareSnapshot): string {
  const name = escapeXml(truncateName(snapshot.displayName))
  const currency = escapeXml(snapshot.displayCurrency)
  const investment = escapeXml(moneyLabel(snapshot.totalInvestment, snapshot.displayCurrency))
  const earnings = escapeXml(moneyLabel(snapshot.totalEarnings, snapshot.displayCurrency))
  const tillDate = escapeXml(moneyLabel(snapshot.earningsTillDate, snapshot.displayCurrency))
  const perf = escapeXml(formatPercent(snapshot.performancePct, { decimals: 2, signed: true }))
  const asOf = escapeXml(snapshot.asOfDate)
  const brand = escapeXml(snapshot.brandName)
  const { width: W, height: H } = PROGRESS_SHARE_SIZE

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07090B"/>
      <stop offset="50%" stop-color="#0A0D10"/>
      <stop offset="100%" stop-color="#0D1115"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C4CBD3"/>
      <stop offset="45%" stop-color="#D4D9DF"/>
      <stop offset="100%" stop-color="#F2F4F7"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#151A20" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#0D1115" stop-opacity="0.94"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="980" cy="70" r="140" fill="#D4D9DF" fill-opacity="0.06"/>
  <circle cx="70" cy="800" r="130" fill="#C9A45C" fill-opacity="0.05"/>

  <g transform="translate(36,28)">
    <rect width="52" height="52" rx="13" fill="url(#mark)"/>
    <text x="26" y="35" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#07090B">W</text>
    <text x="68" y="35" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="650" fill="#F2F4F7">${brand}</text>
  </g>

  <text x="36" y="118" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15" letter-spacing="0.14em" fill="#89939E">MY INVESTMENT PROGRESS</text>
  <text x="36" y="166" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#F2F4F7">${name}</text>
  <text x="36" y="198" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="17" fill="#89939E">Display currency · ${currency}</text>

  <rect x="36" y="222" width="1008" height="520" rx="22" fill="url(#panel)" stroke="#202A33" stroke-width="2"/>

  <text x="72" y="278" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" letter-spacing="0.1em" fill="#89939E">TOTAL INVESTMENT</text>
  <text x="72" y="336" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="46" font-weight="700" fill="#F2F4F7">${investment}</text>

  <line x1="72" y1="368" x2="1008" y2="368" stroke="#202A33" stroke-width="2"/>

  <text x="72" y="418" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" letter-spacing="0.1em" fill="#89939E">TOTAL EARNINGS</text>
  <text x="72" y="474" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#3CCB91">${earnings}</text>

  <text x="548" y="418" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" letter-spacing="0.1em" fill="#89939E">EARNINGS TILL DATE</text>
  <text x="548" y="474" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#3CCB91">${tillDate}</text>

  <line x1="72" y1="514" x2="1008" y2="514" stroke="#202A33" stroke-width="2"/>

  <text x="72" y="564" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" letter-spacing="0.1em" fill="#89939E">PERFORMANCE</text>
  <text x="72" y="624" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="42" font-weight="700" fill="#3CCB91">${perf}</text>

  <text x="72" y="700" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="17" fill="#89939E">As of ${asOf}</text>
  <text x="1008" y="700" text-anchor="end" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="17" font-weight="600" fill="#C9A45C">wealthoracapital.com</text>
</svg>`
}

/** Render a content-tight PNG buffer from a progress snapshot. Read-only — no ledger writes. */
export function renderProgressSharePng(snapshot: ProgressShareSnapshot): Buffer {
  const svg = buildProgressShareSvg(snapshot)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: PROGRESS_SHARE_SIZE.width },
    font: { loadSystemFonts: true },
  })
  return Buffer.from(resvg.render().asPng())
}
