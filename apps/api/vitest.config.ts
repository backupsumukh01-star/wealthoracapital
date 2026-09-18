import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      CSRF_PROTECTION: 'false',
      ENABLE_API_DOCS: 'true',
      METRICS_ENABLED: 'true',
      PAYMENT_WEBHOOK_ALLOW_UNSIGNED: 'true',
      PAYMENT_AUTO_CONFIRM_DEPOSITS: 'false',
      OXAPAY_MERCHANT_API_KEY: 'test-oxapay-merchant-key-for-vitest!!',
      OXAPAY_SANDBOX: 'true',
      // Host-only cookies in tests — parent shells may export COOKIE_DOMAIN for prod-like local.
      COOKIE_DOMAIN: '',
      COOKIE_SECURE: 'false',
      JWT_SALES_SECRET: 'test-wealthora-sales-access-secret-min-32!!',
      JWT_SALES_ISSUER: 'wealthora-sales',
      JWT_SALES_AUDIENCE: 'wealthora-sales',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/server.ts',
        'src/**/*.d.ts',
        'src/emails/transports/**',
      ],
      thresholds: {
        lines: 5,
        functions: 5,
        branches: 5,
        statements: 5,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    fileParallelism: false,
  },
})
