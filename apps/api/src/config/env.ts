import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().min(1).default('Growzy'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('meridian-fx'),
  JWT_AUDIENCE: z.string().default('meridian-fx-web'),

  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  EMAIL_TRANSPORT: z
    .enum(['console', 'smtp', 'resend', 'sendgrid', 'ses', 'mailgun'])
    .default('console'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM_NAME: z.string().default('Growzy'),
  SMTP_FROM_ADDRESS: z.string().min(3).default('noreply@localhost'),
  RESEND_API_KEY: z.string().optional().default(''),
  SENDGRID_API_KEY: z.string().optional().default(''),
  SES_ACCESS_KEY_ID: z.string().optional().default(''),
  SES_SECRET_ACCESS_KEY: z.string().optional().default(''),
  SES_REGION: z.string().optional().default('us-east-1'),
  MAILGUN_API_KEY: z.string().optional().default(''),
  MAILGUN_DOMAIN: z.string().optional().default(''),
  EMAIL_OUTBOX_POLL_MS: z.coerce.number().int().positive().default(30_000),

  // Optional Google OAuth (wire routes when enabling social login)
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  UPLOAD_ROOT: z.string().min(1).default('./uploads'),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  REDIS_URL: z.string().optional().default(''),
  REDIS_REQUIRED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CACHE_DRIVER: z.enum(['memory', 'redis']).default('memory'),
  JOB_DRIVER: z.enum(['memory', 'bullmq']).default('memory'),
  RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('memory'),
  SENTRY_DSN: z.string().optional().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  METRICS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  METRICS_TOKEN: z.string().optional().default(''),
  ENABLE_API_DOCS: z.enum(['true', 'false']).optional(),
  CSRF_PROTECTION: z.enum(['true', 'false']).optional(),
})

type EnvParsed = z.infer<typeof envSchema>

export type Env = Omit<EnvParsed, 'ENABLE_API_DOCS' | 'CSRF_PROTECTION'> & {
  ENABLE_API_DOCS: boolean
  CSRF_PROTECTION: boolean
}

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
  }

  if (
    parsed.data.NODE_ENV === 'production' &&
    (parsed.data.JWT_ACCESS_SECRET.includes('change-me') ||
      parsed.data.JWT_REFRESH_SECRET.includes('change-me'))
  ) {
    throw new Error('Production JWT secrets must be rotated away from placeholder values')
  }

  if (parsed.data.NODE_ENV === 'production') {
    const blocked = ['APP_URL', 'API_URL', 'CORS_ORIGIN'] as const
    for (const key of blocked) {
      const value = parsed.data[key]
      if (typeof value === 'string' && value.includes('localhost')) {
        throw new Error(`${key} must not use localhost in production`)
      }
    }
  }

  // Default ON unless explicitly disabled. Render / PaaS deploys often omit
  // ENABLE_API_DOCS; leaving it off would 404 /api/docs.
  const enableDocs =
    parsed.data.ENABLE_API_DOCS === undefined
      ? true
      : parsed.data.ENABLE_API_DOCS === 'true'

  const underTest =
    parsed.data.NODE_ENV === 'test' || process.env.VITEST === 'true' || process.env.VITEST === '1'

  const csrfProtection =
    parsed.data.CSRF_PROTECTION === undefined
      ? !underTest
      : parsed.data.CSRF_PROTECTION === 'true'

  return {
    ...parsed.data,
    ENABLE_API_DOCS: enableDocs,
    CSRF_PROTECTION: csrfProtection,
  }
}

export const env = parseEnv()

export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'

export function getCorsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}
