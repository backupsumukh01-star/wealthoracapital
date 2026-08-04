/**
 * Client-side defaults mirroring the seeded platform settings in docs/04 §4.
 *
 * These are display defaults only. The server is the authority: the real values arrive from
 * `GET /settings/public` and every limit is re-validated server-side.
 */

export const LIMITS = {
  deposit: {
    min: '50.00',
    quickAmounts: ['100', '500', '1000', '5000'],
  },
  withdrawal: {
    min: '20.00',
    feePct: '0',
    cooldownHours: 24,
  },
  upload: {
    maxBytes: 5 * 1024 * 1024,
    accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    /** SVG is XML and can carry script — never accepted for a payment proof (docs/14 §6). */
    rejected: ['image/svg+xml'],
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    pageSizes: [10, 20, 50, 100],
  },
  password: {
    minLength: 10,
    minStrengthScore: 3,
  },
  dailyReturn: {
    maxPct: '5.0',
  },
} as const

export const CHART_RANGES = ['7d', '30d', '90d', '1y', 'all'] as const
export type ChartRange = (typeof CHART_RANGES)[number]
