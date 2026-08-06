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
  /**
   * Optional per-lane From addresses. Empty → fall back to SMTP_FROM_ADDRESS
   * (the address verified in Resend / SMTP). Hardcoding noreply@ without verifying
   * that mailbox in Resend caused production verification emails to fail.
   */
  EMAIL_FROM_AUTH: z.string().optional().default(''),
  EMAIL_FROM_SUPPORT: z.string().optional().default(''),
  EMAIL_FROM_FINANCE: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  SENDGRID_API_KEY: z.string().optional().default(''),
  SES_ACCESS_KEY_ID: z.string().optional().default(''),
  SES_SECRET_ACCESS_KEY: z.string().optional().default(''),
  SES_REGION: z.string().optional().default('us-east-1'),
  MAILGUN_API_KEY: z.string().optional().default(''),
  MAILGUN_DOMAIN: z.string().optional().default(''),
  EMAIL_OUTBOX_POLL_MS: z.coerce.number().int().positive().default(30_000),
  /** Abort HTTP handlers that hang longer than this (ms). 0 disables. */
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(0).default(30_000),
  /** Soft-exit after uncaughtException (Render restarts). false = stay alive + alert. */
  EXIT_ON_UNCAUGHT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** Comma-separated ops inboxes for deposit/withdrawal/KYC admin alerts */
  ADMIN_ALERT_EMAILS: z.string().optional().default(''),

  // Google OAuth — leave blank to disable social login endpoints
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  // Absolute callback URL registered in Google Cloud Console
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),
  /**
   * Comma-separated Google emails promoted to SUPER_ADMIN on OAuth sign-in.
   * Example: you@gmail.com,boss@company.com
   */
  GOOGLE_SUPER_ADMIN_EMAILS: z.string().optional().default(''),
  /**
   * Comma-separated Google emails promoted to ADMIN on OAuth sign-in.
   * Example: ops@company.com
   * (Also accepts legacy GOOGLE_ADMIN_EMAILS used as SUPER_ADMIN if SUPER list is empty — see service.)
   */
  GOOGLE_ADMIN_EMAILS: z.string().optional().default(''),

  /**
   * Payment provider webhooks (HMAC-SHA256).
   * Leave PAYMENT_WEBHOOK_SECRET empty to reject all webhook posts in production.
   */
  PAYMENT_PROVIDER: z.enum(['generic', 'nowpayments']).default('generic'),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(''),
  PAYMENT_AUTO_CONFIRM_DEPOSITS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /**
   * Dev/test only. When true AND secret is empty, unsigned webhooks are accepted.
   * Never enable on internet-facing environments that share a real ledger DB.
   */
  PAYMENT_WEBHOOK_ALLOW_UNSIGNED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Max age of webhook timestamp claim (seconds); 0 disables skew check. */
  PAYMENT_WEBHOOK_MAX_SKEW_SECONDS: z.coerce.number().int().min(0).default(300),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  UPLOAD_ROOT: z.string().min(1).default('./uploads'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('us-east-1'),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_PUBLIC_BASE_URL: z.string().optional().default(''),
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

  if (parsed.data.STORAGE_DRIVER === 's3' && !parsed.data.S3_BUCKET) {
    throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3')
  }

  // Default: docs on in non-production, off in production (attack-surface reduction).
  // Set ENABLE_API_DOCS=true explicitly if operators need Swagger in prod (prefer IP allowlist).
  const enableDocs =
    parsed.data.ENABLE_API_DOCS === undefined
      ? parsed.data.NODE_ENV !== 'production'
      : parsed.data.ENABLE_API_DOCS === 'true'

  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.PAYMENT_WEBHOOK_ALLOW_UNSIGNED
  ) {
    throw new Error('PAYMENT_WEBHOOK_ALLOW_UNSIGNED must be false in production')
  }

  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.PAYMENT_AUTO_CONFIRM_DEPOSITS &&
    !parsed.data.PAYMENT_WEBHOOK_SECRET
  ) {
    throw new Error(
      'PAYMENT_AUTO_CONFIRM_DEPOSITS requires PAYMENT_WEBHOOK_SECRET in production',
    )
  }

  // Production email must not silently drop mail (auth, KYC, finance).
  if (parsed.data.NODE_ENV === 'production') {
    if (parsed.data.EMAIL_TRANSPORT === 'console') {
      throw new Error('EMAIL_TRANSPORT=console is not allowed in production')
    }
    if (parsed.data.EMAIL_TRANSPORT === 'resend') {
      if (!parsed.data.RESEND_API_KEY?.trim()) {
        throw new Error('RESEND_API_KEY is required when EMAIL_TRANSPORT=resend in production')
      }
      if (
        !parsed.data.SMTP_FROM_ADDRESS?.trim() ||
        parsed.data.SMTP_FROM_ADDRESS.includes('localhost')
      ) {
        throw new Error(
          'SMTP_FROM_ADDRESS must be a real verified sender when EMAIL_TRANSPORT=resend in production',
        )
      }
    }
    if (parsed.data.EMAIL_TRANSPORT === 'sendgrid' && !parsed.data.SENDGRID_API_KEY?.trim()) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_TRANSPORT=sendgrid in production')
    }
    if (
      parsed.data.EMAIL_TRANSPORT === 'mailgun' &&
      (!parsed.data.MAILGUN_API_KEY?.trim() || !parsed.data.MAILGUN_DOMAIN?.trim())
    ) {
      throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN are required in production')
    }
    if (
      parsed.data.EMAIL_TRANSPORT === 'ses' &&
      (!parsed.data.SES_ACCESS_KEY_ID?.trim() || !parsed.data.SES_SECRET_ACCESS_KEY?.trim())
    ) {
      throw new Error('SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY are required in production')
    }
  }

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
