import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // These are behind auth anyway; excluding them keeps them out of search results if a
      // signed-in page is ever shared or cached by a crawler.
      disallow: [
        '/dashboard',
        '/deposit',
        '/withdraw',
        '/trades',
        '/my-performance',
        '/transactions',
        '/notifications',
        '/referrals',
        '/settings',
        '/admin',
        '/oauth',
      ],
    },
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
  }
}
