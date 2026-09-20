import type { DemoEquityPoint } from '@/lib/demo-backtest/types'

export type PublicEquityChartPoint = {
  ts: number
  date: string
  equity: number
  returnPct: number
}

function utcTs(iso: string): number {
  const ts = Date.parse(`${iso.slice(0, 10)}T00:00:00.000Z`)
  return Number.isFinite(ts) ? ts : Number.NaN
}

/** Map the canonical charts.json equityCurve — do not invent points. */
export function mapCanonicalEquityCurve(curve: DemoEquityPoint[] | undefined | null): PublicEquityChartPoint[] {
  if (!Array.isArray(curve) || curve.length === 0) return []
  const out: PublicEquityChartPoint[] = []
  for (const row of curve) {
    const date = String(row?.date ?? '').slice(0, 10)
    const ts = utcTs(date)
    const equity = Number(row?.equity)
    const returnPct = Number(row?.returnPct)
    if (!date || !Number.isFinite(ts) || !Number.isFinite(equity)) continue
    out.push({
      ts,
      date,
      equity,
      returnPct: Number.isFinite(returnPct) ? returnPct : 0,
    })
  }
  return out
}

/** Year ticks for the archive (2022–2026). First tick is the series start. */
export function equityYearTicks(points: PublicEquityChartPoint[]): number[] {
  if (points.length === 0) return []
  const minTs = points[0]!.ts
  const maxTs = points[points.length - 1]!.ts
  const startYear = new Date(minTs).getUTCFullYear()
  const endYear = new Date(maxTs).getUTCFullYear()
  const ticks = [minTs]
  for (let year = startYear + 1; year <= endYear; year += 1) {
    const t = Date.UTC(year, 0, 1)
    if (t > minTs && t <= maxTs) ticks.push(t)
  }
  return ticks
}

export function formatChartDay(iso: string): string {
  const ts = utcTs(iso)
  if (!Number.isFinite(ts)) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(ts))
}

export function formatChartYear(ts: number): string {
  return String(new Date(ts).getUTCFullYear())
}

export function formatChartUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatChartPct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}
