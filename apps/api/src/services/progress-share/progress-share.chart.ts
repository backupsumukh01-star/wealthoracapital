import type { ProgressShareChartPoint } from './progress-share.types.js'

/** Keep real points only; pick evenly spaced samples when the series is long. */
export function thinRealPoints(
  points: ProgressShareChartPoint[],
  max = 40,
): ProgressShareChartPoint[] {
  if (points.length <= max) return points
  const out: ProgressShareChartPoint[] = []
  for (let i = 0; i < max; i += 1) {
    const idx = Math.round((i * (points.length - 1)) / (max - 1))
    out.push(points[idx]!)
  }
  return out
}

export function chartPolyline(
  points: ProgressShareChartPoint[],
  width: number,
  height: number,
  padX = 28,
  padY = 36,
): { line: string; area: string; start: { x: number; y: number }; end: { x: number; y: number } } | null {
  if (points.length < 2) return null
  const values = points.map((p) => Number(p.value))
  if (values.some((v) => !Number.isFinite(v))) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (width - padX * 2)
    const y = padY + (1 - (Number(p.value) - min) / span) * (height - padY * 2)
    return { x, y }
  })
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  const start = coords[0]!
  const end = coords[coords.length - 1]!
  const area = `${line} L ${end.x.toFixed(1)} ${height - 8} L ${start.x.toFixed(1)} ${height - 8} Z`
  return { line, area, start, end }
}
