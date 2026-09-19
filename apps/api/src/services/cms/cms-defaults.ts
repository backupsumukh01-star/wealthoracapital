/**
 * Seed content for CMS documents — mirrors `seedLanding()` in `apps/web/src/lib/admin-os-store.ts`
 * and `createDefaultPlatformCms()` in `apps/web/src/lib/admin-cms-extras.ts` so a fresh database
 * renders the same defaults as the frontend mock store.
 */

export function defaultLandingContent(): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    logoUrl: '/icon',
    companyName: 'Wealthora',
    heroTitle: 'Forex investing with every trade on record',
    heroSubtitle:
      'AI-assisted strategies, human-verified results and transparent historical performance.',
    heroPrimaryCta: 'Start Investing',
    heroSecondaryCta: 'View Historical Performance',
    heroBannerUrl: '',
    avgMonthlyReturn: '6.8',
    winRate: '68',
    aum: '18.4',
    bestDay: '2.4',
    investorCount: '4820',
    countries: '42',
    riskDisclosure:
      'Forex trading involves substantial risk of loss. Past performance does not guarantee future results. Only invest capital you can afford to lose.',
    footerTagline: 'Transparent forex investing with every trade on record.',
    supportEmail: 'update@wealthoracapital.net',
    whatsapp: '+971500000000',
    telegram: 'https://t.me/growzy',
    social: {
      twitter: 'https://twitter.com/growzy',
      linkedin: 'https://linkedin.com/company/growzy',
      facebook: 'https://facebook.com/growzy',
      instagram: 'https://instagram.com/growzy',
      discord: 'https://discord.gg/growzy',
    },
    homepagePopup: {
      enabled: false,
      title: 'Welcome to Wealthora',
      body: 'New investors receive onboarding guidance after email verification.',
      cta: 'Get started',
    },
    announcementsBanner: '',
    heroMotion: { particlesEnabled: true, glowEnabled: true, intensity: 1 },
    status: 'PUBLISHED',
    updatedAt: now,
  }
}

export function defaultPlatformContent(): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    status: 'PUBLISHED',
    updatedAt: now,
    publishedAt: now,
    marketingNav: [
      { id: 'home', label: 'Home', href: '/', enabled: true },
      { id: 'performance', label: 'Performance', href: '/performance', enabled: true },
      { id: 'strategy', label: 'Strategy', href: '/our-trading-system', enabled: true },
      { id: 'how', label: 'How It Works', href: '/how-it-works', enabled: true },
      { id: 'faq', label: 'FAQ', href: '/faq', enabled: true },
      { id: 'contact', label: 'Contact', href: '/contact', enabled: true },
    ],
    dashboard: {
      welcomeTitle: 'Your Wealthora portfolio',
      welcomeSubtitle: 'Balances, returns and desk activity in one place.',
      portfolioEyebrow: 'Portfolio',
      emptyStateHint: 'Fund your wallet to start receiving published daily returns.',
    },
    wallet: {
      title: 'Wallet Center',
      depositCta: 'Deposit',
      withdrawCta: 'Withdraw',
      helperText: 'Deposits require KYC approval. Withdrawals may take 1–2 business days.',
    },
    trades: { title: 'Trade history', emptyHint: 'Published desk trades will appear here.' },
    performance: { title: 'My performance', disclaimer: 'Past performance does not guarantee future results.' },
    supportBlock: {
      headline: 'Need help?',
      body: 'Open a ticket or email support — we typically reply within one business day.',
    },
    riskDisclaimer:
      'Forex and leveraged products involve significant risk of loss. Only invest capital you can afford to lose.',
    contactBlurb: 'Reach Wealthora Capital for onboarding, KYC, or operational questions.',
  }
}

export function defaultFaqs(): Array<{ question: string; answer: string; order: number }> {
  return [
    {
      question: 'How does Wealthora generate returns?',
      answer: 'A discretionary forex desk trades verified strategies; daily results are published to investor wallets.',
      order: 0,
    },
    {
      question: 'Is my capital guaranteed?',
      answer: 'No. Forex trading carries risk of loss — only invest capital you can afford to lose.',
      order: 1,
    },
    {
      question: 'How do withdrawals work?',
      answer: 'Submit a withdrawal request from your wallet; approved requests are paid within 1–2 business days.',
      order: 2,
    },
  ]
}

export function defaultTestimonials(): Array<{
  name: string
  country: string
  quote: string
  rating: number
  platform: string
  order: number
}> {
  return [
    {
      name: 'Ayesha Khan',
      country: 'Pakistan',
      quote:
        'I can open any day and see the exact trades behind the return. That transparency is why I kept depositing after the first month.',
      rating: 5,
      platform: 'Trustpilot',
      order: 0,
    },
    {
      name: 'Marcus Ellison',
      country: 'United Kingdom',
      quote:
        'Losing days are shown clearly — no smoothing, no excuses. Oddly, that made me trust the winning days more.',
      rating: 5,
      platform: 'Google',
      order: 1,
    },
    {
      name: 'Sofia Reyes',
      country: 'Spain',
      quote: 'Withdrawals landed in my bank within a day of approval. Feels like serious software.',
      rating: 5,
      platform: 'Facebook',
      order: 2,
    },
    {
      name: 'Daniel Okonkwo',
      country: 'Nigeria',
      quote:
        'The daily feed and exportable ledger made this feel institutional. I increased my allocation after three quiet months.',
      rating: 5,
      platform: 'Reddit',
      order: 3,
    },
    {
      name: 'Hana Al-Rashid',
      country: 'UAE',
      quote:
        'Support answered payout questions in minutes. The product never overpromises — that alone is rare in this category.',
      rating: 5,
      platform: 'Trustpilot',
      order: 4,
    },
    {
      name: 'Tomás Silva',
      country: 'Portugal',
      quote: 'Charts, trades, and wallet updates stay in sync. Built for people who reconcile numbers.',
      rating: 5,
      platform: 'Google',
      order: 5,
    },
    {
      name: 'Priya Mehta',
      country: 'India',
      quote:
        'The live tape and verified investor badge gave me confidence before my second deposit.',
      rating: 5,
      platform: 'Trustpilot',
      order: 6,
    },
    {
      name: 'Kenji Watanabe',
      country: 'Japan',
      quote: 'Clean UI, honest loss days, fast statements. Exactly what I wanted from a desk.',
      rating: 5,
      platform: 'Google',
      order: 7,
    },
    {
      name: 'Amelia Grant',
      country: 'Canada',
      quote:
        'Payout counter and trade history made diligence straightforward. No Telegram drama — just a ledger.',
      rating: 5,
      platform: 'Facebook',
      order: 8,
    },
  ]
}
