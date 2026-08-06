/**
 * Default Frontend CMS document — section map for Admin Frontend Management.
 * Seeded into CmsDocument key FRONTEND so the landing page is editable without code.
 */

export type FrontendSectionItem = Record<string, unknown> & {
  id?: string
  title?: string
  label?: string
  description?: string
  body?: string
  value?: string
  prefix?: string
  suffix?: string
  icon?: string
  imageUrl?: string
  enabled?: boolean
}

export type FrontendSection = {
  id: string
  key: string
  label: string
  visible: boolean
  order: number
  eyebrow?: string
  title?: string
  description?: string
  bodyHtml?: string
  primaryCta?: string
  primaryCtaHref?: string
  secondaryCta?: string
  secondaryCtaHref?: string
  imageUrl?: string
  videoUrl?: string
  backgroundUrl?: string
  logoUrl?: string
  items?: FrontendSectionItem[]
  meta?: Record<string, unknown>
}

export type FrontendCmsDocument = {
  status: 'DRAFT' | 'PUBLISHED'
  updatedAt: string
  publishedAt: string | null
  sections: FrontendSection[]
  seo: {
    metaTitle: string
    metaDescription: string
    ogImageUrl: string
    faviconUrl: string
  }
  social: {
    twitter: string
    linkedin: string
    facebook: string
    instagram: string
    discord: string
    telegram: string
    whatsapp: string
  }
  contact: {
    supportEmail: string
    supportPhone: string
    address: string
    hours: string
  }
}

function section(
  partial: Omit<FrontendSection, 'order'> & { order?: number },
  order: number,
): FrontendSection {
  return { ...partial, order: partial.order ?? order, visible: partial.visible ?? true }
}

export function defaultFrontendContent(): FrontendCmsDocument {
  const now = new Date().toISOString()
  return {
    status: 'PUBLISHED',
    updatedAt: now,
    publishedAt: now,
    seo: {
      metaTitle: 'Growzy Capital — Transparent forex investing',
      metaDescription:
        'AI-assisted forex strategies with human-verified daily returns and a full public trade ledger.',
      ogImageUrl: '',
      faviconUrl: '/icon',
    },
    social: {
      twitter: 'https://twitter.com/growzy',
      linkedin: 'https://linkedin.com/company/growzy',
      facebook: 'https://facebook.com/growzy',
      instagram: 'https://instagram.com/growzy',
      discord: 'https://discord.gg/growzy',
      telegram: 'https://t.me/growzy',
      whatsapp: '+971500000000',
    },
    contact: {
      supportEmail: 'support@growzy.com',
      supportPhone: '',
      address: '',
      hours: 'Mon–Fri · business hours',
    },
    sections: [
      section(
        {
          id: 'sec_hero',
          key: 'hero',
          label: 'Hero Section',
          visible: true,
          eyebrow: 'Growzy Capital',
          title: 'Forex investing with every trade on record',
          description:
            'AI-assisted strategies, human-verified results and transparent historical performance.',
          primaryCta: 'Start Investing',
          primaryCtaHref: '/register',
          secondaryCta: 'View Historical Performance',
          secondaryCtaHref: '/performance',
          logoUrl: '/icon',
          backgroundUrl: '',
          imageUrl: '',
          videoUrl: '',
          meta: {
            particlesEnabled: true,
            glowEnabled: true,
            intensity: 1,
            companyName: 'Growzy',
          },
        },
        0,
      ),
      section(
        {
          id: 'sec_stats',
          key: 'statistics',
          label: 'Statistics',
          visible: true,
          eyebrow: 'At a glance',
          title: 'Programme statistics',
          description: 'Illustrative figures for presentation — updated from Admin.',
          items: [
            { id: 's1', label: 'Active investors', value: '4820', suffix: '+', icon: 'users' },
            { id: 's2', label: 'Countries', value: '42', icon: 'globe' },
            { id: 's3', label: 'Assets under management', value: '18.4', prefix: '$', suffix: 'M', icon: 'piggy' },
            { id: 's4', label: 'Avg. monthly return', value: '6.8', suffix: '%', icon: 'trending' },
          ],
        },
        1,
      ),
      section(
        {
          id: 'sec_about',
          key: 'about',
          label: 'About',
          visible: true,
          eyebrow: 'About',
          title: 'A desk that publishes its work',
          description: 'Growzy runs discretionary forex strategies with operator-verified daily results.',
          bodyHtml:
            '<p>Every eligible wallet receives the same verified daily figure. Losing days are shown with the same care as winning days.</p>',
          imageUrl: '',
        },
        2,
      ),
      section(
        {
          id: 'sec_features',
          key: 'features',
          label: 'Features',
          visible: true,
          eyebrow: 'Platform',
          title: 'Infrastructure that feels expensive — because it is careful',
          description: 'Glass surfaces, precise ledgers, and a desk that publishes its work.',
          items: [
            {
              id: 'f1',
              title: 'Published trade history',
              description: 'Inspect entries, exits, and returns for the desk book.',
              icon: 'candlestick',
            },
            {
              id: 'f2',
              title: 'Operator-verified days',
              description: 'No distribution without a human sign-off.',
              icon: 'shield',
            },
            {
              id: 'f3',
              title: 'Withdraw anytime',
              description: 'Request payouts without lock-ups or hidden gates.',
              icon: 'landmark',
            },
            {
              id: 'f4',
              title: 'Institutional posture',
              description: 'Audit trails for deposits, KYC, and settlements.',
              icon: 'building',
            },
          ],
        },
        3,
      ),
      section(
        {
          id: 'sec_why',
          key: 'why_choose_us',
          label: 'Why Choose Us',
          visible: true,
          eyebrow: 'Why Growzy',
          title: 'Built for verification',
          description: 'Compact reasons to inspect the platform — not marketing promises.',
          items: [
            { id: 'w1', title: 'Verified Trade History', description: 'Full ticket trail for every session.', icon: 'badge-check' },
            { id: 'w2', title: 'AI + Human Desk', description: 'Models propose; operators decide.', icon: 'cpu' },
            { id: 'w3', title: 'Transparent Ledgers', description: 'Wallet math you can reconcile.', icon: 'wallet' },
            { id: 'w4', title: 'Risk Controls', description: 'Hard limits before every ticket.', icon: 'shield' },
            { id: 'w5', title: 'Fast Withdrawals', description: 'Reviewed payouts with a clear trail.', icon: 'trending' },
            { id: 'w6', title: 'Global Access', description: 'Onboarding for supported regions.', icon: 'candlestick' },
          ],
        },
        4,
      ),
      section(
        {
          id: 'sec_strategy',
          key: 'trading_strategy',
          label: 'Trading Strategy',
          visible: true,
          eyebrow: 'Trading desk',
          title: 'How the desk runs a trading day',
          description: 'From session open to daily distribution.',
          items: [
            { id: 't1', title: 'Trend Following', description: 'Ride established directional moves.', value: '82' },
            { id: 't2', title: 'Momentum Trading', description: 'Enter when impulse and volume align.', value: '76' },
            { id: 't3', title: 'Breakout Detection', description: 'Flag compressed ranges near release.', value: '71' },
            { id: 't4', title: 'Liquidity Zones', description: 'Map pools where orders tend to cluster.', value: '84' },
          ],
        },
        5,
      ),
      section(
        {
          id: 'sec_performance',
          key: 'performance',
          label: 'Performance',
          visible: true,
          eyebrow: 'Track record',
          title: 'Published performance you can inspect',
          description: 'Monthly and yearly figures with the same honesty as losing days.',
          items: [
            { id: 'p1', label: 'Avg monthly', value: '6.8', suffix: '%' },
            { id: 'p2', label: 'Win rate', value: '68', suffix: '%' },
            { id: 'p3', label: 'Best day', value: '2.4', suffix: '%' },
            { id: 'p4', label: 'AUM', value: '18.4', prefix: '$', suffix: 'M' },
          ],
        },
        6,
      ),
      section(
        {
          id: 'sec_timeline',
          key: 'timeline',
          label: 'Timeline',
          visible: true,
          eyebrow: 'Investor journey',
          title: 'From deposit to payout — one clear path',
          description: 'Each milestone is logged. Nothing important happens off-platform.',
          items: [
            { id: 'j1', title: 'Deposit', description: 'Fund via bank, card, or crypto.' },
            { id: 'j2', title: 'Verification', description: 'Operator confirms the transfer.' },
            { id: 'j3', title: 'Trading', description: 'Desk executes under risk limits.' },
            { id: 'j4', title: 'Profit', description: 'Verified daily returns publish to wallets.' },
            { id: 'j5', title: 'Withdrawal', description: 'Request a payout anytime.' },
          ],
        },
        7,
      ),
      section(
        {
          id: 'sec_how',
          key: 'how_it_works',
          label: 'How It Works',
          visible: true,
          eyebrow: 'How it works',
          title: 'Four steps from register to published returns',
          description: 'Simple path. No lock-up. The desk publishes the work.',
          items: [
            { id: 'h1', title: 'Register', description: 'Create your investor account and verify email.' },
            { id: 'h2', title: 'Deposit', description: 'Fund your wallet and complete KYC when required.' },
            { id: 'h3', title: 'Trading', description: 'The desk trades; you inspect the book.' },
            { id: 'h4', title: 'Returns', description: 'Verified daily figures credit eligible balances.' },
          ],
        },
        8,
      ),
      section(
        {
          id: 'sec_testimonials',
          key: 'testimonials',
          label: 'Testimonials',
          visible: true,
          eyebrow: 'Investor voices',
          title: 'Trusted by people who check the ledger',
          description: 'Attributed quotes from funded accounts. Past results do not guarantee future performance.',
          items: [],
          meta: { useCmsTestimonials: true },
        },
        9,
      ),
      section(
        {
          id: 'sec_faq',
          key: 'faq',
          label: 'FAQ',
          visible: true,
          eyebrow: 'FAQ',
          title: 'Clear answers before you deposit',
          description: 'The essentials. Full help centre lives under Resources.',
          items: [],
          meta: { useCmsFaqs: true },
        },
        10,
      ),
      section(
        {
          id: 'sec_cta',
          key: 'cta',
          label: 'CTA',
          visible: true,
          eyebrow: 'Get started',
          title: 'Ready to inspect the ledger?',
          description: 'Open an account, fund when ready, and follow published daily results.',
          primaryCta: 'Create account',
          primaryCtaHref: '/register',
          secondaryCta: 'Contact support',
          secondaryCtaHref: '/contact',
        },
        11,
      ),
      section(
        {
          id: 'sec_footer',
          key: 'footer',
          label: 'Footer',
          visible: true,
          title: 'Growzy Capital',
          description: 'Transparent forex investing with every trade on record.',
          meta: { newsletterEnabled: true, newsletterLabel: 'Newsletter' },
        },
        12,
      ),
      section(
        {
          id: 'sec_contact',
          key: 'contact',
          label: 'Contact',
          visible: true,
          eyebrow: 'Contact',
          title: 'Talk to the operations desk',
          description: 'Onboarding, KYC, and operational questions.',
        },
        13,
      ),
      section(
        {
          id: 'sec_seo',
          key: 'seo',
          label: 'SEO',
          visible: true,
          title: 'Search & social metadata',
          description: 'Managed via the SEO panel — not rendered as a page section.',
          meta: { adminOnly: true },
        },
        14,
      ),
      section(
        {
          id: 'sec_social',
          key: 'social_links',
          label: 'Social Links',
          visible: true,
          title: 'Social profiles',
          description: 'Managed via the Social panel.',
          meta: { adminOnly: true },
        },
        15,
      ),
      section(
        {
          id: 'sec_downloads',
          key: 'downloads',
          label: 'Download Section',
          visible: true,
          eyebrow: 'Resources',
          title: 'Reports & downloads',
          description: 'Published statements and programme documents.',
          meta: { useCmsDownloads: true },
        },
        16,
      ),
      section(
        {
          id: 'sec_security',
          key: 'security',
          label: 'Security',
          visible: true,
          eyebrow: 'Risk management',
          title: 'Hard limits before every ticket',
          description: 'Controls the desk enforces — not personalised advice.',
        },
        17,
      ),
      section(
        {
          id: 'sec_markets',
          key: 'markets',
          label: 'Markets',
          visible: true,
          eyebrow: "Today's markets",
          title: 'Session context',
          description: 'Illustrative tape for presentation.',
        },
        18,
      ),
    ],
  }
}
