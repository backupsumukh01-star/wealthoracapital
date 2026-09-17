import { env } from '@/lib/env'

export const BRAND = {
  name: env.NEXT_PUBLIC_PLATFORM_NAME,
  legalName: 'Wealthora Capital',
  supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
  theme: {
    defaultMode: 'dark' as const,
    accent: 'platinum-silver',
  },
  defaultCurrency: 'USD',
  defaultLanguage: 'en',
  defaultTimezone: 'Asia/Dubai',
} as const
