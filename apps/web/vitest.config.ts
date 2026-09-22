import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  test: {
    environment: 'node',
    include: [
      'src/components/admin/admin-attribution.test.ts',
      'src/features/landing/live-stats.test.ts',
      'src/lib/usd-only-investor-payments.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
})
