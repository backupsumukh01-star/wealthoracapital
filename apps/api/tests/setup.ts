/**
 * Vitest global setup — ensure JWT secrets exist before any module imports env.
 * Integration tests that hit Postgres use the same DATABASE_URL as local dev unless
 * TEST_DATABASE_URL is provided.
 */
import { config as loadDotenv } from 'dotenv'

loadDotenv()

process.env.NODE_ENV ||= 'test'
process.env.CSRF_PROTECTION = 'false'
process.env.ENABLE_API_DOCS ||= 'true'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-min-32-characters-long!!'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-min-32-characters-long!'
process.env.DATABASE_URL ||=
  process.env.TEST_DATABASE_URL ||
  'postgresql://meridian:meridian@localhost:5432/meridian?schema=public'
process.env.EMAIL_TRANSPORT ||= 'console'
process.env.APP_URL ||= 'http://localhost:3000'
process.env.API_URL ||= 'http://localhost:4000'
process.env.CORS_ORIGIN ||= 'http://localhost:3000'
process.env.BCRYPT_ROUNDS ||= '10'
process.env.LOG_LEVEL ||= 'silent'
