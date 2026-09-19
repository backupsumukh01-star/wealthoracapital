import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import base from '@meridian/config/eslint.base.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  ...base,
  {
    ignores: ['**/*.test.ts', '**/*.test.tsx', 'vitest.config.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'react/no-danger': 'error',
    },
  },
  {
    // Primitives stay dumb: only ui/motion components are barred from feature code.
    files: ['src/components/ui/**', 'src/components/motion/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message:
                'components/ui and components/motion must not import from features/*. ' +
                'Pass data in as props.',
            },
          ],
        },
      ],
    },
  },
  {
    // JSON-LD is serialised by us and never contains user input (docs/14 §10).
    files: ['src/components/common/seo.tsx'],
    rules: { 'react/no-danger': 'off' },
  },
]

export default config
