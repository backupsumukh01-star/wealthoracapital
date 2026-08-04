/** Instruments the desk may record a trade against. Grouped for the combobox in the admin form. */

export const MAJOR_PAIRS = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
] as const

export const MINOR_PAIRS = [
  'EUR/GBP',
  'EUR/JPY',
  'EUR/CHF',
  'EUR/AUD',
  'GBP/JPY',
  'GBP/CHF',
  'AUD/JPY',
  'CAD/JPY',
  'CHF/JPY',
  'NZD/JPY',
  'AUD/NZD',
  'AUD/CAD',
] as const

export const EXOTIC_PAIRS = [
  'USD/TRY',
  'USD/ZAR',
  'USD/MXN',
  'USD/SGD',
  'USD/HKD',
  'USD/NOK',
  'USD/SEK',
  'EUR/TRY',
] as const

export const METALS = ['XAU/USD', 'XAG/USD'] as const

export const PAIR_GROUPS = [
  { label: 'Majors', pairs: MAJOR_PAIRS },
  { label: 'Minors', pairs: MINOR_PAIRS },
  { label: 'Exotics', pairs: EXOTIC_PAIRS },
  { label: 'Metals', pairs: METALS },
] as const

export const ALL_PAIRS = [
  ...MAJOR_PAIRS,
  ...MINOR_PAIRS,
  ...EXOTIC_PAIRS,
  ...METALS,
] as const

export type CurrencyPair = (typeof ALL_PAIRS)[number]

/** JPY-quoted pairs are conventionally shown to 3 decimals, everything else to 5. */
export function pairPrecision(pair: string): number {
  if (pair.endsWith('/JPY')) return 3
  if (pair.startsWith('XAU') || pair.startsWith('XAG')) return 2
  return 5
}
