/**
 * Seed content for CMS documents — mirrors `seedLanding()` in `apps/web/src/lib/admin-os-store.ts`
 * and `createDefaultPlatformCms()` in `apps/web/src/lib/admin-cms-extras.ts` so a fresh database
 * renders the same defaults as the frontend mock store.
 */

export function defaultLandingContent(): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    logoUrl: '/icon',
    companyName: 'Growzy',
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
    supportEmail: 'support@growzy.com',
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
      title: 'Welcome to Growzy',
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
      welcomeTitle: 'Your Growzy portfolio',
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
    contactBlurb: 'Reach Growzy Capital for onboarding, KYC, or operational questions.',
  }
}

export function defaultFaqs(): Array<{ question: string; answer: string; order: number }> {
  return [
    {
      question: 'How does Growzy generate returns?',
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
      name: 'A. Karim',
      country: 'UAE',
      quote: 'Transparent daily updates and fast withdrawals.',
      rating: 5,
      platform: 'Growzy',
      order: 0,
    },
  ]
}
