import type { MetadataRoute } from 'next'
import { ROUTES } from '@meridian/shared'

import { SITE } from '@/lib/constants'

/** Public pages only. Authenticated routes are excluded by `robots.ts` as well as by omission. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const entries: Array<{
    path: string
    priority: number
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  }> = [
    { path: ROUTES.marketing.home, priority: 1, changeFrequency: 'weekly' },
    { path: ROUTES.marketing.ourTradingSystem, priority: 0.9, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.performance, priority: 0.9, changeFrequency: 'daily' },
    { path: ROUTES.marketing.transparency, priority: 0.85, changeFrequency: 'weekly' },
    { path: ROUTES.marketing.security, priority: 0.8, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.technology, priority: 0.75, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.investors, priority: 0.75, changeFrequency: 'weekly' },
    { path: ROUTES.marketing.resources, priority: 0.7, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.howItWorks, priority: 0.7, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.about, priority: 0.6, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.faq, priority: 0.7, changeFrequency: 'monthly' },
    { path: ROUTES.marketing.contact, priority: 0.5, changeFrequency: 'yearly' },
    { path: ROUTES.marketing.legal.terms, priority: 0.3, changeFrequency: 'yearly' },
    { path: ROUTES.marketing.legal.privacy, priority: 0.3, changeFrequency: 'yearly' },
    { path: ROUTES.marketing.legal.riskDisclosure, priority: 0.4, changeFrequency: 'yearly' },
    { path: ROUTES.marketing.legal.refundPolicy, priority: 0.3, changeFrequency: 'yearly' },
  ]

  return entries.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, SITE.url).toString(),
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
