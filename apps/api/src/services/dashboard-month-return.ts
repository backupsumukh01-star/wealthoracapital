import { d } from '../utils/money.js'

/** Arithmetic sum of daily return % values → display string (not compounded, not averaged). */
export function sumPublishedDailyReturnPcts(
  pcts: Array<string | number | null | undefined>,
): string {
  if (pcts.length === 0) return '0.00'
  const sum = pcts.reduce((acc, pct) => acc.plus(d(pct ?? 0)), d(0))
  return sum.toFixed(2)
}
