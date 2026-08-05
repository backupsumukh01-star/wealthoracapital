import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  dts: false,
  // Bundle workspace contracts; keep runtime deps external.
  noExternal: ['@meridian/shared'],
  external: [
    '@prisma/client',
    '@sentry/node',
    'bcrypt',
    'bullmq',
    'cookie-parser',
    'cors',
    'dotenv',
    'express',
    'express-rate-limit',
    'helmet',
    'ioredis',
    'jsonwebtoken',
    'pino',
    'pino-http',
    'pino-pretty',
    'prom-client',
    'uuid',
    'zod',
  ],
})
