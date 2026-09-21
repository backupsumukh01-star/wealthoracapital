import type { DailyShareInput, OverallShareInput } from './types'

/**
 * Review fixtures only. Production must pass live snapshot fields — never these literals.
 * Chart for overall uses the two published capital figures (started → now).
 * Daily chart is empty: the current API snapshot has no intraday series.
 */
export const SAMPLE_OVERALL: OverallShareInput = {
  type: 'overall',
  investorName: 'farhan E',
  totalInvestment: '$5,182.09',
  totalEarnings: '$1,016.59',
  currentValue: '$6,198.68',
  performance: '+148.69%',
  date: '2026-09-21',
  chartData: [
    { label: 'Started', value: 5182.09 },
    { label: 'Now', value: 6198.68 },
  ],
}

export const SAMPLE_DAILY: DailyShareInput = {
  type: 'daily',
  investorName: 'farhan E',
  todayEarnings: '$48.32',
  dailyReturn: '+0.96%',
  totalEarnings: '$1,016.59',
  date: '21 Sep 2026',
  chartData: [],
}
