import { z } from 'zod'

/**
 * Public environment, validated at module load.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so each key must be referenced
 * literally rather than looked up dynamically. Production builds must supply real HTTPS URLs
 * via Render (or other) environment variables — do not rely on localhost defaults in prod.
 */
const isProd = process.env.NODE_ENV === 'production'

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: isProd
    ? z
        .string()
        .url()
        .refine((value) => !value.includes('localhost'), {
          message: 'NEXT_PUBLIC_API_URL must not use localhost in production',
        })
    : z.string().url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_SITE_URL: isProd
    ? z
        .string()
        .url()
        .refine((value) => !value.includes('localhost'), {
          message: 'NEXT_PUBLIC_SITE_URL must not use localhost in production',
        })
    : z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_PLATFORM_NAME: z.string().min(1).default('Wealthora Capital'),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default('update@wealthoracapital.net'),
  NEXT_PUBLIC_ENABLE_REFERRALS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  NEXT_PUBLIC_ENABLE_ROUTE_GUARDS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
})

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_PLATFORM_NAME: process.env.NEXT_PUBLIC_PLATFORM_NAME,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_ENABLE_REFERRALS: process.env.NEXT_PUBLIC_ENABLE_REFERRALS,
  NEXT_PUBLIC_ENABLE_ROUTE_GUARDS: process.env.NEXT_PUBLIC_ENABLE_ROUTE_GUARDS,
})

if (!parsed.success) {
  throw new Error(
    `Invalid public environment:\n${parsed.error.issues
      .map((issue) => `  · ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}`,
  )
}

export const env = parsed.data
