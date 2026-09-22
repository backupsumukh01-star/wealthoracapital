/**
 * Pixel overlay for 1080×1920 HD posters.
 * Edit x / y / size / color, then refresh /progress-share/designs.
 * x,y = CSS top-left of the text.
 */
export const POSTER_SIZE = { width: 1080, height: 1920 } as const

export type OverlaySlot = {
  x: number
  y: number
  size: number
  color: string
  weight: number
  tracking?: string
  shadow?: string
  gradient?: { from: string; mid: string; to: string }
}

export const DAILY_SLOTS: Record<
  | 'name'
  | 'earnedToday'
  | 'currentBalance'
  | 'currentBalanceLabel'
  | 'dailyReturn'
  | 'totalEarnings'
  | 'date'
  | 'todayProfit',
  OverlaySlot
> = {
  name: { x: 72, y: 258, size: 78, color: '#F3F6F8', weight: 800, tracking: '-0.035em' },
  earnedToday: {
    x: 68,
    y: 438,
    size: 124,
    color: '#8EEFD0',
    weight: 800,
    tracking: '-0.05em',
    gradient: { from: '#F6FFFB', mid: '#A8F4D8', to: '#2ED48C' },
    shadow: '0 0 22px rgba(80,220,170,0.45)',
  },
  currentBalanceLabel: {
    x: 68,
    y: 562,
    size: 18,
    color: '#A8B4BE',
    weight: 600,
    tracking: '0.12em',
  },
  currentBalance: { x: 68, y: 592, size: 40, color: '#F4F7FA', weight: 700, tracking: '-0.03em' },
  dailyReturn: { x: 242, y: 778, size: 34, color: '#F4F7FA', weight: 700, tracking: '-0.03em' },
  totalEarnings: { x: 668, y: 778, size: 42, color: '#F4F7FA', weight: 700, tracking: '-0.03em' },
  date: { x: 138, y: 1748, size: 30, color: '#E8EEF2', weight: 700, tracking: '0.08em' },
  todayProfit: { x: 922, y: 998, size: 21, color: '#F3F6F8', weight: 700, tracking: '-0.03em' },
}

export const DAILY_COVERS = [
  { x: 262, y: 756, w: 176, h: 72, fill: '#041C16', rx: 12 },
] as const

export const DAILY_POSTERS = {
  a: '/progress-share/daily-a.jpg',
  b: '/progress-share/daily-b.jpg',
} as const

export const JOURNEY_SLOTS: Record<
  'name' | 'growthPct' | 'totalProfit' | 'totalInvestment' | 'currentValue',
  OverlaySlot
> = {
  name: { x: 86, y: 268, size: 50, color: '#F3F6F8', weight: 800, tracking: '-0.03em' },
  growthPct: { x: 70, y: 452, size: 88, color: '#4AE3A6', weight: 800, tracking: '-0.04em' },
  totalProfit: { x: 78, y: 798, size: 42, color: '#5EE4B0', weight: 700, tracking: '-0.03em' },
  totalInvestment: { x: 268, y: 928, size: 30, color: '#F4F7FA', weight: 700, tracking: '-0.03em' },
  currentValue: { x: 748, y: 928, size: 30, color: '#F4F7FA', weight: 700, tracking: '-0.03em' },
}

export const JOURNEY_COVERS = [] as const

export const JOURNEY_DOLLAR_STAMPS = [
  { x: 113, y: 797, w: 52, h: 99, dx: 52 },
] as const
