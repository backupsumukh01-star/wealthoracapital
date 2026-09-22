/**
 * Keep in sync with apps/web/.../prototype/overlay-layout.ts
 * x,y = top-left of the text. SVG baseline = y + size * 0.8
 */
export const DAILY_SLOTS = {
  name: { x: 72, y: 258, size: 78, color: '#F3F6F8', weight: 800 },
  earnedToday: {
    x: 68,
    y: 438,
    size: 124,
    color: '#8EEFD0',
    weight: 800,
    gradient: { from: '#F6FFFB', mid: '#A8F4D8', to: '#2ED48C' },
  },
  dailyReturn: { x: 242, y: 778, size: 34, color: '#F4F7FA', weight: 700 },
  totalEarnings: { x: 668, y: 778, size: 42, color: '#F4F7FA', weight: 700 },
  date: { x: 138, y: 1748, size: 30, color: '#E8EEF2', weight: 700 },
  todayProfit: { x: 922, y: 998, size: 21, color: '#F3F6F8', weight: 700 },
} as const

export const DAILY_COVERS = [
  { x: 262, y: 756, w: 176, h: 72, fill: '#041C16', rx: 12 },
] as const

export const JOURNEY_SLOTS = {
  name: { x: 86, y: 268, size: 50, color: '#F3F6F8', weight: 800 },
  growthPct: { x: 70, y: 452, size: 88, color: '#4AE3A6', weight: 800 },
  totalProfit: { x: 78, y: 798, size: 42, color: '#5EE4B0', weight: 700 },
  totalInvestment: { x: 268, y: 928, size: 30, color: '#F4F7FA', weight: 700 },
  currentValue: { x: 748, y: 928, size: 30, color: '#F4F7FA', weight: 700 },
} as const

export const JOURNEY_COVERS = [] as const

/** Clone empty card pixels over the baked TOTAL PROFIT "$" only. */
export const JOURNEY_DOLLAR_STAMPS = [
  { x: 113, y: 797, w: 52, h: 99, dx: 52 },
] as const

export function svgY(slot: { y: number; size: number }): number {
  return Math.round(slot.y + slot.size * 0.8)
}
