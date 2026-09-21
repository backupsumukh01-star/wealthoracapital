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
  async onSuccess() {
    const { cpSync, mkdirSync } = await import('node:fs')
    mkdirSync('dist/progress-share-assets', { recursive: true })
    cpSync('src/services/progress-share/assets', 'dist/progress-share-assets', {
      recursive: true,
      filter: (src) => !src.includes('_preview') && !src.endsWith('.png'),
    })
  },
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
