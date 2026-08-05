/** Production stubs — empty fixtures. Prefer CMS / public performance APIs for live data. */

export type ReviewPlatform = 'Trustpilot' | 'Google' | 'Facebook' | 'Reddit'

export const LANDING_STATS = [] as any[]

export const WHY_CHOOSE_US = [
  {
    title: 'Verified Trade History',
    description: 'Published tickets show pair, side, entry, exit, and return.',
    icon: 'candlestick',
  },
  {
    title: 'Historical Performance',
    description: 'Inspect the archive — including losing days — before you fund.',
    icon: 'badge-check',
  },
  {
    title: 'Transparent Ledger',
    description: 'Deposits, distributions, and withdrawals stay exportable.',
    icon: 'shield',
  },
  {
    title: 'AI + Human Review',
    description: 'Models propose; the desk validates before capital is risked.',
    icon: 'cpu',
  },
  {
    title: 'Global Investors',
    description: 'A growing community across major financial hubs.',
    icon: 'trending',
  },
  {
    title: 'Withdraw Anytime',
    description: 'No lock-up. Request a payout whenever your balance allows.',
    icon: 'wallet',
  },
] as any[]

export const WHY_US = WHY_CHOOSE_US

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create your account',
    description: 'Register with email and complete verification.',
    body: 'Register with email and complete verification.',
  },
  {
    step: '02',
    title: 'Fund your wallet',
    description: 'Deposit via supported payment rails.',
    body: 'Deposit via supported payment rails.',
  },
  {
    step: '03',
    title: 'Track performance',
    description: 'Follow published trades and daily returns.',
    body: 'Follow published trades and daily returns.',
  },
  {
    step: '04',
    title: 'Withdraw anytime',
    description: 'Request payouts when your balance allows.',
    body: 'Request payouts when your balance allows.',
  },
] as any[]

export const MONTHLY_RETURNS = [] as any[]
export const YEARLY_RETURNS = [] as any[]
export const GROWTH_SERIES = [] as any[]
export const SAMPLE_TRADES = [] as any[]
export const TESTIMONIALS = [] as any[]
export const FOREX_TICKER = [] as any[]
export const LIVE_ACTIVITY = [] as any[]
export const INVESTOR_HUBS = [] as any[]
export const MAP_LINKS: Array<[string, string]> = []
export const TRUST_METRICS = [] as any[]
export const LIVE_TRADE_POOL = [] as any[]
export const RECENT_DISTRIBUTIONS = [] as any[]

export const PLATFORM_FEATURES = [
  {
    title: 'Live trade desk',
    body: 'Published positions with full ticket detail.',
    description: 'Published positions with full ticket detail.',
    tone: 'accent',
    rails: [],
  },
  {
    title: 'Daily settlements',
    body: 'Returns posted to your ledger after each trading day.',
    description: 'Returns posted to your ledger after each trading day.',
    tone: 'cyan',
    rails: [],
  },
  {
    title: 'Secure withdrawals',
    body: 'Multi-step review before funds leave the platform.',
    description: 'Multi-step review before funds leave the platform.',
    tone: 'amber',
    rails: [],
  },
] as any[]

export const LANDING_FAQS = [] as any[]
export const HOME_FAQS = LANDING_FAQS
