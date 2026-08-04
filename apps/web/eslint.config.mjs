import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import base from '@meridian/config/eslint.base.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  ...base,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Primitives stay dumb: nothing in components/ui may reach into feature code (docs/01 §6).
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
      'react/no-danger': 'error',
    },
  },
  {
    // The ban applies to primitives only; pages and feature components legitimately use hooks.
    files: ['src/app/**', 'src/components/{marketing,dashboard,admin,common}/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // JSON-LD is serialised by us and never contains user input (docs/14 §10).
    files: ['src/components/common/seo.tsx'],
    rules: { 'react/no-danger': 'off' },
  },
]

export default config
