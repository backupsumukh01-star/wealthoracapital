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
 * Visual language mirrors apps/web opengraph-image (Growzy dark finance gradient).
 */

export const PROGRESS_SHARE_SIZE = { width: 1080, height: 1080 } as const

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateName(name: string, max = 28): string {
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07131C"/>
      <stop offset="55%" stop-color="#0C1C28"/>
      <stop offset="100%" stop-color="#0A2420"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5EF2C4"/>
      <stop offset="45%" stop-color="#12D6A0"/>
      <stop offset="100%" stop-color="#2AE8FF"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#102433" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#0B1A24" stop-opacity="0.88"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1080" fill="url(#bg)"/>
  <circle cx="920" cy="160" r="220" fill="#12D6A0" fill-opacity="0.08"/>
  <circle cx="140" cy="960" r="260" fill="#2AE8FF" fill-opacity="0.06"/>

  <g transform="translate(72,72)">
    <rect width="88" height="88" rx="24" fill="url(#mark)"/>
    <text x="44" y="60" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#07131C">G</text>
    <text x="112" y="58" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="40" font-weight="650" fill="#F4F8FB">${brand}</text>
  </g>

  <text x="72" y="240" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" letter-spacing="0.12em" fill="#8B9BB0">MY INVESTMENT PROGRESS</text>
  <text x="72" y="310" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="52" font-weight="700" fill="#F4F8FB">${name}</text>
  <text x="72" y="358" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" fill="#9AA4B5">Display currency · ${currency}</text>

  <rect x="72" y="410" width="936" height="420" rx="28" fill="url(#panel)" stroke="#1E3A4A" stroke-width="2"/>

  <text x="110" y="480" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" letter-spacing="0.08em" fill="#8B9BB0">TOTAL INVESTMENT</text>
  <text x="110" y="548" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="#F4F8FB">${investment}</text>

  <text x="110" y="630" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" letter-spacing="0.08em" fill="#8B9BB0">TOTAL EARNINGS</text>
  <text x="110" y="698" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="48" font-weight="700" fill="#5EF2C4">${earnings}</text>

  <text x="560" y="630" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" letter-spacing="0.08em" fill="#8B9BB0">EARNINGS TILL DATE</text>
  <text x="560" y="698" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="48" font-weight="700" fill="#5EF2C4">${tillDate}</text>

  <text x="110" y="780" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" letter-spacing="0.08em" fill="#8B9BB0">PERFORMANCE</text>
  <text x="110" y="840" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#2AE8FF">${perf}</text>

  <text x="72" y="980" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" fill="#9AA4B5">As of ${asOf}</text>
  <text x="1008" y="980" text-anchor="end" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" font-weight="600" fill="#5EF2C4">growzycapital.com</text>
</svg>`
}

/** Render a 1080×1080 PNG buffer from a progress snapshot. Read-only — no ledger writes. */
export function renderProgressSharePng(snapshot: ProgressShareSnapshot): Buffer {
  const svg = buildProgressShareSvg(snapshot)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: PROGRESS_SHARE_SIZE.width },
    font: { loadSystemFonts: true },
  })
  return Buffer.from(resvg.render().asPng())
}
