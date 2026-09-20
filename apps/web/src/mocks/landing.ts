/**
 * Dummy data for the marketing landing page.
 * Realistic figures for presentation only — not live API data.
 */

export const LANDING_STATS = [
  {
    label: 'Total investors',
    value: '1786',
    prefix: '',
    suffix: '+',
    hint: 'Verified accounts with at least one funded deposit',
  },
  {
    label: 'Assets under management',
    value: '2.63',
    prefix: '$',
    suffix: 'M',
    decimals: 2,
    hint: 'Combined wallet balances across active accounts',
  },
  {
    label: 'Profit distributed',
    value: '2.63',
    prefix: '$',
    suffix: 'M',
    decimals: 2,
    hint: 'Lifetime sum of daily returns paid to investors',
  },
  {
    label: 'Avg. monthly return',
    value: '15.3',
    prefix: '',
    suffix: '%',
    decimals: 1,
    hint: 'Arithmetic average monthly return across the published 4-year programme',
  },
  {
    label: 'Countries supported',
    value: '42',
    prefix: '',
    suffix: '',
    hint: 'Where we currently accept new investor registrations',
  },
] as const

/** Homepage “Why choose us” — six trust cards, conversion-focused. */
export const WHY_CHOOSE_US = [
  {
    title: 'Verified Trade History',
    description: 'Published tickets show pair, side, entry, exit and return.',
    icon: 'candlestick' as const,
  },
  {
    title: 'Historical Performance',
    description: 'Inspect the archive — including losing days — before you fund.',
    icon: 'badge-check' as const,
  },
  {
    title: 'Transparent Ledger',
    description: 'Deposits, distributions and withdrawals stay exportable.',
    icon: 'shield' as const,
  },
  {
    title: 'AI + Human Review',
    description: 'Models propose; the desk validates before capital is risked.',
    icon: 'cpu' as const,
  },
  {
    title: 'Global Investors',
    description: 'A growing community across major financial hubs.',
    icon: 'trending' as const,
  },
  {
    title: 'Withdraw Anytime',
    description: 'No lock-up. Request a payout whenever your balance allows.',
    icon: 'wallet' as const,
  },
] as const

/** Broader advantages used on deeper marketing pages. */
export const WHY_US = [
  {
    title: 'AI-assisted strategies',
    description:
      'Models scan major and minor pairs around the clock. A human desk verifies every signal before capital is committed.',
    icon: 'cpu' as const,
  },
  {
    title: 'Verified daily returns',
    description:
      'Returns are not estimated. An operator reviews closed trades, then applies the confirmed percentage to every funded wallet.',
    icon: 'badge-check' as const,
  },
  {
    title: 'Full trade transparency',
    description:
      'See the pair, direction, entry, exit and return for every position behind your daily result — wins and losses alike.',
    icon: 'candlestick' as const,
  },
  {
    title: 'Withdraw when you want',
    description:
      'No lock-up periods and no exit fees. Request a payout from your dashboard; our team processes it after a short review.',
    icon: 'wallet' as const,
  },
  {
    title: 'Compounding by default',
    description:
      'Daily returns apply to your full balance, so profit can earn alongside principal. Simple-interest mode is available if your programme uses it.',
    icon: 'trending' as const,
  },
  {
    title: 'Audit-ready history',
    description:
      'Every deposit, distribution and withdrawal is stored forever. Export CSV or PDF statements whenever you need them.',
    icon: 'shield' as const,
  },
] as const

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Register',
    description:
      'Create an account, verify your email and accept the risk disclosure before funding.',
  },
  {
    step: '02',
    title: 'Deposit',
    description:
      'Fund via bank, crypto or mobile wallet and upload proof for operator review.',
  },
  {
    step: '03',
    title: 'Trading',
    description:
      'The desk trades with AI assistance and human oversight. Closed tickets publish the same day.',
  },
  {
    step: '04',
    title: 'Receive Returns',
    description:
      'Verified daily percentages apply to eligible wallets after operator confirmation.',
  },
] as const

/** Illustrative monthly programme returns (UI demo only). */
export const MONTHLY_RETURNS = [
  { month: 'Jan', returnPct: 13.42 },
  { month: 'Feb', returnPct: 16.87 },
  { month: 'Mar', returnPct: 14.21 },
  { month: 'Apr', returnPct: 15.96 },
  { month: 'May', returnPct: 13.78 },
  { month: 'Jun', returnPct: 16.54 },
  { month: 'Jul', returnPct: 15.12 },
  { month: 'Aug', returnPct: 14.33 },
  { month: 'Sep', returnPct: 16.81 },
  { month: 'Oct', returnPct: 13.91 },
  { month: 'Nov', returnPct: 15.67 },
  { month: 'Dec', returnPct: 16.98 },
] as const

export const YEARLY_RETURNS = [
  { year: '2023', returnPct: 48.2, profitLabel: '$412K distributed' },
  { year: '2024', returnPct: 61.5, profitLabel: '$1.1M distributed' },
  { year: '2025', returnPct: 54.8, profitLabel: '$1.9M distributed' },
  { year: '2026 YTD', returnPct: 38.4, profitLabel: '$890K distributed' },
] as const

/** Equity curve points for the growth chart (illustrative). */
export const GROWTH_SERIES = [
  { label: 'Jan', value: 100 },
  { label: 'Feb', value: 104 },
  { label: 'Mar', value: 111 },
  { label: 'Apr', value: 115 },
  { label: 'May', value: 123 },
  { label: 'Jun', value: 130 },
  { label: 'Jul', value: 141 },
  { label: 'Aug', value: 147 },
  { label: 'Sep', value: 156 },
  { label: 'Oct', value: 167 },
  { label: 'Nov', value: 177 },
  { label: 'Dec', value: 189 },
] as const

export const SAMPLE_TRADES = [
  {
    date: '2026-08-01',
    pair: 'EUR/USD',
    direction: 'BUY' as const,
    entry: '1.1700',
    exit: '1.1782',
    returnPct: '0.70',
  },
  {
    date: '2026-08-01',
    pair: 'GBP/USD',
    direction: 'SELL' as const,
    entry: '1.2840',
    exit: '1.2821',
    returnPct: '0.15',
  },
  {
    date: '2026-07-31',
    pair: 'USD/JPY',
    direction: 'BUY' as const,
    entry: '149.20',
    exit: '149.05',
    returnPct: '-0.10',
  },
  {
    date: '2026-07-31',
    pair: 'AUD/USD',
    direction: 'BUY' as const,
    entry: '0.6520',
    exit: '0.6558',
    returnPct: '0.58',
  },
  {
    date: '2026-07-30',
    pair: 'XAU/USD',
    direction: 'SELL' as const,
    entry: '2412.40',
    exit: '2401.10',
    returnPct: '0.47',
  },
  {
    date: '2026-07-30',
    pair: 'USD/CAD',
    direction: 'BUY' as const,
    entry: '1.3720',
    exit: '1.3695',
    returnPct: '-0.18',
  },
] as const

export type ReviewPlatform = 'Trustpilot' | 'Google' | 'Facebook' | 'Reddit'

export const TESTIMONIALS = [
  {
    name: 'Ayesha Khan',
    country: 'Pakistan',
    platform: 'Trustpilot' as ReviewPlatform,
    rating: 5,
    date: '12 Jul 2026',
    size: 'lg' as const,
    tone: 'glow' as const,
    investmentAmount: '$8,500',
    profitPct: '+34.2%',
    quote:
      'I can open any day and see the exact trades behind the return. That transparency is why I kept depositing after the first month.',
  },
  {
    name: 'Marcus Ellison',
    country: 'United Kingdom',
    platform: 'Google' as ReviewPlatform,
    rating: 5,
    date: '3 Jun 2026',
    size: 'md' as const,
    tone: 'emerald' as const,
    investmentAmount: '$12,000',
    profitPct: '+41.6%',
    quote:
      'Losing days are shown clearly — no smoothing, no excuses. Oddly, that made me trust the winning days more.',
  },
  {
    name: 'Sofia Reyes',
    country: 'Spain',
    platform: 'Facebook' as ReviewPlatform,
    rating: 5,
    date: '28 May 2026',
    size: 'sm' as const,
    tone: 'cyan' as const,
    investmentAmount: '$3,200',
    profitPct: '+28.7%',
    quote: 'Withdrawals landed in my bank within a day of approval. Feels like serious software.',
  },
  {
    name: 'Daniel Okonkwo',
    country: 'Nigeria',
    platform: 'Reddit' as ReviewPlatform,
    rating: 5,
    date: '19 Apr 2026',
    size: 'md' as const,
    tone: 'violet' as const,
    investmentAmount: '$5,000',
    profitPct: '+52.1%',
    quote:
      'The daily feed and exportable ledger made this feel institutional. I increased my allocation after three quiet months.',
  },
  {
    name: 'Hana Al-Rashid',
    country: 'UAE',
    platform: 'Trustpilot' as ReviewPlatform,
    rating: 5,
    date: '2 Aug 2026',
    size: 'lg' as const,
    tone: 'amber' as const,
    investmentAmount: '$25,000',
    profitPct: '+38.9%',
    quote:
      'Support answered payout questions in minutes. The product never overpromises — that alone is rare in this category.',
  },
  {
    name: 'Tomás Silva',
    country: 'Portugal',
    platform: 'Google' as ReviewPlatform,
    rating: 5,
    date: '11 Mar 2026',
    size: 'sm' as const,
    tone: 'default' as const,
    investmentAmount: '$2,800',
    profitPct: '+19.4%',
    quote: 'Charts, trades and wallet updates stay in sync. Built for people who reconcile numbers.',
  },
  {
    name: 'Priya Mehta',
    country: 'India',
    platform: 'Trustpilot' as ReviewPlatform,
    rating: 5,
    date: '22 Jul 2026',
    size: 'md' as const,
    tone: 'blue' as const,
    investmentAmount: '$6,400',
    profitPct: '+29.8%',
    quote:
      'The live tape and verified investor badge gave me confidence before my second deposit.',
  },
  {
    name: 'Kenji Watanabe',
    country: 'Japan',
    platform: 'Google' as ReviewPlatform,
    rating: 5,
    date: '8 May 2026',
    size: 'sm' as const,
    tone: 'cyan' as const,
    investmentAmount: '$4,500',
    profitPct: '+22.3%',
    quote: 'Clean UI, honest loss days, fast statements. Exactly what I wanted from a desk.',
  },
  {
    name: 'Amelia Grant',
    country: 'Canada',
    platform: 'Facebook' as ReviewPlatform,
    rating: 5,
    date: '30 Jun 2026',
    size: 'md' as const,
    tone: 'emerald' as const,
    investmentAmount: '$9,200',
    profitPct: '+44.5%',
    quote:
      'Payout counter and trade history made diligence straightforward. No Telegram drama — just a ledger.',
  },
  {
    name: 'Luca Ferreira',
    country: 'Brazil',
    platform: 'Trustpilot' as ReviewPlatform,
    rating: 5,
    date: '14 Jun 2026',
    size: 'md' as const,
    tone: 'violet' as const,
    investmentAmount: '$7,800',
    profitPct: '+31.2%',
    quote:
      'Six months in and every distribution has matched the trade tape exactly. That consistency is everything.',
  },
  {
    name: 'Natalia Petrov',
    country: 'Germany',
    platform: 'Google' as ReviewPlatform,
    rating: 5,
    date: '25 May 2026',
    size: 'lg' as const,
    tone: 'glow' as const,
    investmentAmount: '$15,000',
    profitPct: '+47.8%',
    quote:
      'The CSV export and audit trail turned due diligence into a thirty-minute exercise. Rare in this space.',
  },
  {
    name: 'Omar Abdalla',
    country: 'Kenya',
    platform: 'Facebook' as ReviewPlatform,
    rating: 5,
    date: '7 Aug 2026',
    size: 'sm' as const,
    tone: 'amber' as const,
    investmentAmount: '$1,500',
    profitPct: '+18.6%',
    quote:
      'Started with a small amount to test. Ledger matched everything I expected. Doubled my position last month.',
  },
] as const

export function testimonialCountryMix(
  items: ReadonlyArray<{ country: string }> = TESTIMONIALS,
): {
  total: number
  india: number
  international: number
  indiaShare: number
} {
  const total = items.length
  const india = items.filter((t) => t.country === 'India').length
  return {
    total,
    india,
    international: total - india,
    indiaShare: total === 0 ? 0 : india / total,
  }
}

/** Floating FX tape — presentation only, values drift client-side. */
/** @deprecated Not for LIVE UI. Marketing market prices use GET /markets/quotes. Kept for Admin OS seed fixtures only. */
export const FOREX_TICKER = [
  { pair: 'EUR/USD', price: '1.0864', change: '0.12' },
  { pair: 'GBP/USD', price: '1.2731', change: '-0.08' },
  { pair: 'USD/JPY', price: '149.82', change: '0.21' },
  { pair: 'AUD/USD', price: '0.6624', change: '0.09' },
  { pair: 'NZD/USD', price: '0.6018', change: '-0.05' },
  { pair: 'XAU/USD', price: '2418.6', change: '0.34' },
  { pair: 'BTC/USD', price: '68420', change: '1.12' },
  { pair: 'ETH/USD', price: '3520.4', change: '-0.64' },
] as const

/** Rotating social-proof toasts — deposit / withdrawal. */
export const LIVE_ACTIVITY = [
  { type: 'deposit' as const, name: 'Ravi K.', region: 'IN', amount: '2500.00' },
  { type: 'withdrawal' as const, name: 'Elena V.', region: 'ES', amount: '890.25' },
  { type: 'deposit' as const, name: 'James R.', region: 'GB', amount: '5000.00' },
  { type: 'withdrawal' as const, name: 'Farah A.', region: 'PK', amount: '1200.00' },
  { type: 'deposit' as const, name: 'Noah K.', region: 'SG', amount: '1500.00' },
  { type: 'withdrawal' as const, name: 'Priya S.', region: 'IN', amount: '3400.50' },
  { type: 'deposit' as const, name: 'Omar H.', region: 'AE', amount: '10000.00' },
  { type: 'withdrawal' as const, name: 'Sofia R.', region: 'ES', amount: '750.00' },
] as const

/** Glowing hubs on the investor map (x/y as % of 1000×500 viewBox). */
export const INVESTOR_HUBS = [
  {
    id: 'nyc',
    label: 'New York',
    x: 24.0,
    y: 36.0,
    investors: '820+',
    aum: '$2.1M',
    activity: '18 deposits · 11 withdrawals',
  },
  {
    id: 'tor',
    label: 'Toronto',
    x: 22.5,
    y: 32.0,
    investors: '310+',
    aum: '$780K',
    activity: '6 deposits · 4 withdrawals',
  },
  {
    id: 'lon',
    label: 'London',
    x: 48.2,
    y: 32.5,
    investors: '1,140+',
    aum: '$4.6M',
    activity: '24 deposits · 19 withdrawals',
  },
  {
    id: 'fra',
    label: 'Frankfurt',
    x: 51.0,
    y: 34.0,
    investors: '420+',
    aum: '$1.1M',
    activity: '9 deposits · 7 withdrawals',
  },
  {
    id: 'dxb',
    label: 'Dubai',
    x: 62.5,
    y: 42.0,
    investors: '690+',
    aum: '$2.8M',
    activity: '15 deposits · 12 withdrawals',
  },
  {
    id: 'mum',
    label: 'Mumbai',
    x: 70.5,
    y: 46.5,
    investors: '1,260+',
    aum: '$3.2M',
    activity: '31 deposits · 22 withdrawals',
  },
  {
    id: 'sgp',
    label: 'Singapore',
    x: 78.5,
    y: 58.0,
    investors: '540+',
    aum: '$1.9M',
    activity: '11 deposits · 8 withdrawals',
  },
  {
    id: 'tyo',
    label: 'Tokyo',
    x: 86.0,
    y: 40.0,
    investors: '380+',
    aum: '$1.4M',
    activity: '8 deposits · 5 withdrawals',
  },
  {
    id: 'syd',
    label: 'Sydney',
    x: 88.0,
    y: 72.0,
    investors: '290+',
    aum: '$920K',
    activity: '5 deposits · 3 withdrawals',
  },
] as const

/** Soft arcs between hubs — illustrative network, not routing data. */
export const MAP_LINKS: Array<[string, string]> = [
  ['nyc', 'lon'],
  ['lon', 'dxb'],
  ['lon', 'fra'],
  ['dxb', 'mum'],
  ['mum', 'sgp'],
  ['sgp', 'tyo'],
  ['sgp', 'syd'],
  ['tor', 'lon'],
  ['nyc', 'tor'],
]

export const TRUST_METRICS = [
  { label: 'Investors', value: '1786', suffix: '+', accent: 'emerald' as const },
  { label: 'Countries supported', value: '42', suffix: '', accent: 'cyan' as const },
  { label: 'Trading days', value: '1025', suffix: '', accent: 'blue' as const },
  { label: 'Published trades', value: '2567', suffix: '', accent: 'amber' as const },
] as const

/** Pool for the continuously updating trade feed. */
export const LIVE_TRADE_POOL = [
  { pair: 'EUR/USD', direction: 'BUY' as const, entry: '1.0852', exit: '1.0889', returnPct: '0.34' },
  { pair: 'GBP/USD', direction: 'SELL' as const, entry: '1.2740', exit: '1.2718', returnPct: '0.17' },
  { pair: 'USD/JPY', direction: 'BUY' as const, entry: '149.40', exit: '149.12', returnPct: '-0.19' },
  { pair: 'XAU/USD', direction: 'BUY' as const, entry: '2410.20', exit: '2422.80', returnPct: '0.52' },
  { pair: 'AUD/USD', direction: 'SELL' as const, entry: '0.6590', exit: '0.6571', returnPct: '0.29' },
  { pair: 'USD/CAD', direction: 'BUY' as const, entry: '1.3625', exit: '1.3658', returnPct: '0.24' },
  { pair: 'EUR/GBP', direction: 'SELL' as const, entry: '0.8548', exit: '0.8562', returnPct: '-0.16' },
  { pair: 'NZD/USD', direction: 'BUY' as const, entry: '0.6001', exit: '0.6024', returnPct: '0.38' },
] as const

/** Illustrative withdrawal examples for marketing — not ledger payouts. Range $35–$10,000. */
export const RECENT_DISTRIBUTIONS = [
  { amount: '4280.50', hours: '6', name: 'Farah A.', region: 'PK' },
  { amount: '9500.00', hours: '11', name: 'James R.', region: 'GB' },
  { amount: '890.25', hours: '4', name: 'Elena V.', region: 'ES' },
  { amount: '3100.00', hours: '9', name: 'Omar H.', region: 'AE' },
  { amount: '6750.80', hours: '14', name: 'Priya S.', region: 'IN' },
  { amount: '2140.00', hours: '7', name: 'Noah K.', region: 'SG' },
] as const

export const PLATFORM_FEATURES = [
  {
    title: 'Built for major FX venues',
    description:
      'Strategies span liquid majors and select crosses. Execution stays under desk control — never a black-box bot with your keys.',
    tone: 'accent' as const,
  },
  {
    title: 'Multi-pair coverage',
    description: 'EUR, GBP, JPY, AUD, XAU and more — published every session with entry, exit and return.',
    tone: 'dark' as const,
    chips: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'],
  },
  {
    title: 'Familiar funding rails',
    description: 'Bank transfer, major cards and select crypto rails — instructions and proof upload in one flow.',
    tone: 'dark' as const,
    rails: ['Bank', 'Card', 'USDT', 'Wise', 'Local'],
  },
  {
    title: 'In-house ledger technology',
    description:
      'Every distribution is decimal-safe, audit-logged and reconcilable against the published trade tape.',
    tone: 'dark' as const,
  },
] as const

export const LANDING_FAQS = [
  {
    question: 'How does Wealthora generate returns?',
    answer:
      'AI-assisted models propose FX setups across major and minor pairs. A human trading desk reviews, executes and closes positions. At the end of each trading day, an operator verifies the net result and applies that percentage to every eligible funded wallet.',
  },
  {
    question: 'Are daily returns guaranteed?',
    answer:
      'No. Forex trading can lose money. Some days the programme return is negative, and your balance decreases by that percentage. We show losing days with the same prominence as winning ones.',
  },
  {
    question: 'When does a new deposit start earning?',
    answer:
      'A deposit approved during trading day D becomes eligible from day D+1. Funds that were already in your wallet at the start of the day participate in that day’s distribution.',
  },
  {
    question: 'Can I withdraw at any time?',
    answer:
      'Yes. There is no lock-up. Request a withdrawal from your dashboard, choose a saved payout method and wait for operator review. Locked funds stop being available immediately so you cannot over-withdraw.',
  },
  {
    question: 'What is the minimum deposit?',
    answer:
      'The current minimum is shown on the deposit screen before you submit. It can change with platform settings; the amount that applies is always the one displayed at submission time.',
  },
  {
    question: 'How do I know the trade history is real?',
    answer:
      'Every published trade includes pair, direction, entry, exit and return percentage. Your personal earning for that day is tied to the same distribution run, so you can reconcile the maths yourself.',
  },
  {
    question: 'Is my capital insured or guaranteed?',
    answer:
      'No. Only commit funds you can afford to lose. Past performance does not guarantee future results. Read the risk disclosure before you register or deposit.',
  },
  {
    question: 'Who manages the AI strategies?',
    answer:
      'Models assist with scanning and ranking setups. Execution, risk limits and the final daily return figure are controlled by the human desk and recorded in an audit trail.',
  },
] as const

/** Short FAQ set for the homepage — full list lives on /faq and /resources. */
export const HOME_FAQS = LANDING_FAQS.slice(0, 5)
