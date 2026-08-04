// Shared ESLint flat-config base for the Meridian FX workspace.
// Apps extend this and add their own framework plugins.

/** @type {import('eslint').Linter.Config[]} */
export const base = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
    ],
  },
  {
    rules: {
      // The money model forbids float arithmetic and the ledger has a single writer.
      // These bans make the architectural rules in docs/02 mechanical rather than cultural.
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Money is Decimal. Use @meridian/shared money helpers.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'Dynamic code construction is banned (docs/14 §4 item 30).',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval is banned (docs/14 §4 item 30).',
        },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

export default base
