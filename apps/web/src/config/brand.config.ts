import { env } from '@/lib/env'

export const BRAND = {
  name: env.NEXT_PUBLIC_PLATFORM_NAME,
  legalName: 'Growzy Capital',
  supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
  theme: {
    defaultMode: 'dark' as const,
    accent: 'emerald-cyan',
  },
  defaultCurrency: 'USD',
  defaultLanguage: 'en',
  defaultTimezone: 'Asia/Dubai',
} as const
