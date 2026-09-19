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

/**
 * Full risk statement for the dedicated legal page and deposit confirmation surfaces.
 * Marketing chrome uses a short past-performance note + Risk Disclosure footer link.
 */
export const RISK_DISCLOSURE =
  'Trading involves risk and can result in the loss of your capital. Historical performance ' +
  'is provided for transparency only. Losing days are shown with the same prominence as ' +
  'winning ones. Past performance does not guarantee future results. Only commit funds you ' +
  'can afford to lose.'

export const QUERY_STALE_TIME = {
  slow: 5 * 60 * 1000,
  normal: 60 * 1000,
  fast: 30 * 1000,
} as const

export const SKELETON_ROWS = 6
