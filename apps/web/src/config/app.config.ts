import { LIMITS, ROUTES } from '@meridian/shared'

import { env } from '@/lib/env'

import { BRAND } from './brand.config'
import { COOKIES } from './cookies.config'
import { DEFAULT_FEATURE_FLAGS } from './feature-flags.config'
import { PERMISSIONS, STAFF_ROLE_LABELS } from './permissions.config'

/**
 * Single configuration surface for the web app.
 * Env → brand → routes → limits → flags → cookies.
 */
export const appConfig = {
  env: {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    isDemo: process.env.NODE_ENV !== 'production',
    routeGuardsEnabled: process.env.NEXT_PUBLIC_ENABLE_ROUTE_GUARDS !== 'false',
  },
  brand: BRAND,
  routes: ROUTES,
  limits: LIMITS,
  featureFlags: DEFAULT_FEATURE_FLAGS,
  cookies: COOKIES,
  permissions: PERMISSIONS,
  staffRoleLabels: STAFF_ROLE_LABELS,
  networks: ['TRC20', 'ERC20', 'BEP20'] as const,
  currencies: ['USD'] as const,
} as const

export type AppConfig = typeof appConfig
