import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'
import { formatDecimal, formatPercent } from '@meridian/shared'

import type { ProgressShareKind, ProgressShareSnapshot } from './progress-share.types.js'
import {
  DAILY_COVERS,
  DAILY_SLOTS,
  JOURNEY_COVERS,
  JOURNEY_DOLLAR_STAMPS,
  JOURNEY_SLOTS,
  svgY,
} from './progress-share.overlay.js'

export const PROGRESS_SHARE_SIZE = { width: 1080, height: 1920 } as const

const FONT = 'Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateName(name: string, max = 22): string {
  const trimmed = name.trim() || 'Investor'
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function usdSigned(amount: string): string {
  const n = formatDecimal(amount, 2)
  if (!amount.trim().startsWith('-') && Number(amount) > 0) return `+$${n}`
  if (amount.trim().startsWith('-')) return `−$${n.replace('-', '')}`
  return `$${n}`
}

function usdSymbol(amount: string): string {
  return `$${formatDecimal(amount, 2)}`
}

function posterDate(iso: string): string {
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return iso.trim().toUpperCase()
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${match[3]} ${months[Number(match[2]) - 1]} ${match[1]}`
}

function pctDisplay(value: string): string {
  return formatPercent(value, { decimals: 2, signed: true })
}

function resolveAsset(file: string): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, 'assets', file),
    join(here, 'progress-share-assets', file),
    join(process.cwd(), 'src/services/progress-share/assets', file),
    join(process.cwd(), 'apps/api/src/services/progress-share/assets', file),
  ]
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error(`Progress share template missing: ${file}`)
  return found
}

function templateDataUri(kind: ProgressShareKind): string {
  const file = kind === 'daily' ? 'daily.jpg' : 'journey.jpg'
  const buf = readFileSync(resolveAsset(file))
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

function slotText(
  slot: { x: number; y: number; size: number; color: string; weight: number; gradient?: { from: string; mid: string; to: string } },
  value: string,
): string {
  const fill = slot.gradient ? 'url(#earnedToday)' : slot.color
  const filter = slot.gradient ? ' filter="url(#earnedGlow)"' : ''
  return `<text x="${slot.x}" y="${svgY(slot)}" text-anchor="start" font-family="${FONT}" font-size="${slot.size}" font-weight="${slot.weight}" fill="${fill}"${filter}>${escapeXml(value)}</text>`
}

function earnedTodayDefs(): string {
  const g = DAILY_SLOTS.earnedToday.gradient
  if (!g) return ''
  const slot = DAILY_SLOTS.earnedToday
  const x2 = slot.x + Math.round(slot.size * 4.4)
  return `<defs>
  <linearGradient id="earnedToday" x1="${slot.x}" y1="0" x2="${x2}" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${g.from}"/>
    <stop offset="0.42" stop-color="${g.mid}"/>
    <stop offset="1" stop-color="${g.to}"/>
  </linearGradient>
  <filter id="earnedGlow" x="-15%" y="-40%" width="130%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/>
    <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.83  0 0 0 0 0.55  0 0 0 0.42 0" result="glow"/>
    <feMerge>
      <feMergeNode in="glow"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>`
}

function coverRects(
  covers: readonly { x: number; y: number; w: number; h: number; fill: string; rx?: number }[],
): string {
  return covers
    .map(
      (c) =>
        `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx ?? 12}" fill="${c.fill}"/>`,
    )
    .join('\n')
}

function cloneStamps(
  href: string,
  stamps: readonly { x: number; y: number; w: number; h: number; dx: number }[],
): string {
  if (!stamps.length) return ''
  const defs = stamps
    .map(
      (s, i) =>
        `<clipPath id="jstamp${i}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/></clipPath>`,
    )
    .join('')
  const copies = stamps
    .map(
      (s, i) =>
        `<g clip-path="url(#jstamp${i})"><image href="${href}" xlink:href="${href}" x="${-s.dx}" y="0" width="${PROGRESS_SHARE_SIZE.width}" height="${PROGRESS_SHARE_SIZE.height}" preserveAspectRatio="none"/></g>`,
    )
    .join('\n')
  return `<defs>${defs}</defs>\n${copies}`
}

/** Overlay-only markup — used by tests so base64 photo bytes are not searched. */
export function buildProgressShareOverlay(
  snapshot: ProgressShareSnapshot,
  kind: ProgressShareKind = 'journey',
): string {
  const name = truncateName(snapshot.displayName)
  if (kind === 'daily') {
    return [
      earnedTodayDefs(),
      coverRects(DAILY_COVERS),
      slotText(DAILY_SLOTS.name, name),
      slotText(DAILY_SLOTS.earnedToday, usdSymbol(snapshot.todayEarnings)),
      slotText(DAILY_SLOTS.currentBalanceLabel, 'CURRENT BALANCE'),
      slotText(DAILY_SLOTS.currentBalance, usdSymbol(snapshot.currentValue)),
      slotText(DAILY_SLOTS.dailyReturn, pctDisplay(snapshot.dailyReturnPct)),
      slotText(DAILY_SLOTS.totalEarnings, formatDecimal(snapshot.totalEarnings, 2)),
      slotText(DAILY_SLOTS.todayProfit, usdSymbol(snapshot.todayEarnings)),
      slotText(DAILY_SLOTS.date, posterDate(snapshot.asOfDate)),
    ].join('\n')
  }
  return [
    coverRects(JOURNEY_COVERS),
    slotText(JOURNEY_SLOTS.name, name),
    slotText(JOURNEY_SLOTS.growthPct, pctDisplay(snapshot.performancePct).replace(/%/g, '')),
    slotText(JOURNEY_SLOTS.totalProfit, usdSigned(snapshot.totalEarnings)),
    slotText(JOURNEY_SLOTS.totalInvestment, formatDecimal(snapshot.totalInvestment, 2)),
    slotText(JOURNEY_SLOTS.currentValue, formatDecimal(snapshot.currentValue, 2)),
  ].join('\n')
}

export function buildProgressShareSvg(
  snapshot: ProgressShareSnapshot,
  kind: ProgressShareKind = 'journey',
): string {
  const { width: W, height: H } = PROGRESS_SHARE_SIZE
  const href = templateDataUri(kind)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <image href="${href}" xlink:href="${href}" width="${W}" height="${H}" preserveAspectRatio="none"/>
  ${kind === 'journey' ? cloneStamps(href, JOURNEY_DOLLAR_STAMPS) : ''}
  ${buildProgressShareOverlay(snapshot, kind)}
</svg>`
}

export function renderProgressSharePng(
  snapshot: ProgressShareSnapshot,
  kind: ProgressShareKind = 'journey',
): Buffer {
  const svg = buildProgressShareSvg(snapshot, kind)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: PROGRESS_SHARE_SIZE.width },
    font: { loadSystemFonts: true },
  })
  return Buffer.from(resvg.render().asPng())
}
