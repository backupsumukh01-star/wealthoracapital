import { env } from './env'

/** Brand and copy constants that appear across more than one surface. */
export const SITE = {
  name: env.NEXT_PUBLIC_PLATFORM_NAME,
  /** Legal entity — About, Footer, Terms, Privacy only. */
  legalName: 'Wealthora Capital Partners',
  /** Primary logo wordmark. */
  wordmark: { primary: 'Wealthora', secondary: '' },
  tagline: 'AI-assisted Forex investing with verified daily returns.',
  description:
    'Invest in AI-assisted forex strategies, watch every published trade and receive ' +
    'operator-verified daily returns in your wallet. Transparent history. Withdraw when you want.',
  url: env.NEXT_PUBLIC_SITE_URL,
  supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
} as const

export const QUERY_STALE_TIME = {
  slow: 5 * 60 * 1000,
  normal: 60 * 1000,
  fast: 30 * 1000,
} as const

export const SKELETON_ROWS = 6
