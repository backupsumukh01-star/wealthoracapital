import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'
import { formatDecimal, formatPercent } from '@meridian/shared'

import type { ProgressShareKind, ProgressShareSnapshot } from './progress-share.types.js'

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

function nameSize(name: string): number {
  if (name.length > 18) return 34
  if (name.length > 12) return 40
  return 46
}

function usdBare(amount: string, signed = false): string {
  const n = formatDecimal(amount, 2)
  if (signed && !amount.trim().startsWith('-') && Number(amount) > 0) return `+${n}`
  if (amount.trim().startsWith('-')) return `−${n.replace('-', '')}`
  return n
}

function pctBare(value: string): string {
  return formatPercent(value, { decimals: 2, signed: true }).replace(/%/g, '')
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

function text(
  x: number,
  y: number,
  value: string,
  opts: { size: number; fill: string; weight?: number; anchor?: string },
): string {
  return `<text x="${x}" y="${y}" text-anchor="${opts.anchor ?? 'start'}" font-family="${FONT}" font-size="${opts.size}" font-weight="${opts.weight ?? 750}" fill="${opts.fill}">${escapeXml(value)}</text>`
}

/** Overlay-only markup — used by tests so base64 photo bytes are not searched. */
export function buildProgressShareOverlay(
  snapshot: ProgressShareSnapshot,
  kind: ProgressShareKind = 'journey',
): string {
  const name = truncateName(snapshot.displayName)
  const ns = nameSize(name)
  if (kind === 'daily') {
    return [
      text(98, 328, name, { size: ns, fill: '#F4F7FA', weight: 700 }),
      text(268, 568, usdBare(snapshot.todayEarnings), { size: 72, fill: '#5EE4B0', weight: 800 }),
      text(200, 828, pctBare(snapshot.dailyReturnPct), { size: 36, fill: '#F4F7FA' }),
      text(700, 828, usdBare(snapshot.totalEarnings), { size: 34, fill: '#F4F7FA' }),
    ].join('\n')
  }
  return [
    text(99, 328, name, { size: ns, fill: '#F4F7FA', weight: 700 }),
    text(108, 598, pctBare(snapshot.performancePct), { size: 84, fill: '#5EE4B0', weight: 800 }),
    text(248, 878, usdBare(snapshot.totalEarnings, true), { size: 40, fill: '#5EE4B0' }),
    text(335, 1002, usdBare(snapshot.totalInvestment), { size: 28, fill: '#F4F7FA' }),
    text(790, 1002, usdBare(snapshot.currentValue), { size: 28, fill: '#F4F7FA' }),
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
