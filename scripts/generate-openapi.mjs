/**
 * Generates docs/openapi/openapi.json and docs/openapi/openapi.yaml
 * covering every Growzy Express API endpoint (Phases 1-6).
 *
 * Run: node scripts/generate-openapi.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'docs', 'openapi')

// ── helpers ──────────────────────────────────────────────────────────────────

const paths = {}

function ensurePath(p) {
  if (!paths[p]) paths[p] = {}
  return paths[p]
}

function ref(name) {
  return { $ref: `#/components/schemas/${name}` }
}

function paramRef(name) {
  return { $ref: `#/components/parameters/${name}` }
}

function respRef(name) {
  return { $ref: `#/components/responses/${name}` }
}

function envelope(dataSchema) {
  return {
    type: 'object',
    required: ['success', 'data', 'meta'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: dataSchema,
      meta: ref('ResponseMeta'),
    },
  }
}

function success(dataSchema, status = 200, description = 'OK', example) {
  const schema = envelope(dataSchema ?? { type: 'object', nullable: true })
  const body = {
    schema,
    ...(example
      ? {
          example: {
            success: true,
            data: example,
            meta: { requestId: '00000000-0000-4000-8000-000000000001', timestamp: '2026-08-05T10:00:00.000Z' },
          },
        }
      : {}),
  }
  return {
    [String(status)]: {
      description,
      content: { 'application/json': body },
    },
  }
}

function standardErrors(def) {
  const out = {
    400: respRef('BadRequest'),
    401: respRef('Unauthorized'),
    403: respRef('Forbidden'),
    404: respRef('NotFound'),
    409: respRef('Conflict'),
    422: respRef('UnprocessableEntity'),
    429: respRef('TooManyRequests'),
    500: respRef('InternalError'),
  }
  if (def.security && Array.isArray(def.security) && def.security.length === 0) {
    delete out[401]
    delete out[403]
  }
  return out
}

function jsonBody(schema, required = true) {
  return {
    required,
    content: { 'application/json': { schema } },
  }
}

function multipartBody(properties, requiredFields = []) {
  return {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          required: requiredFields,
          properties,
        },
      },
    },
  }
}

/**
 * @param {'get'|'post'|'put'|'patch'|'delete'} method
 * @param {string} path
 * @param {object} def
 */
function op(method, path, def) {
  const entry = ensurePath(path)
  const operation = {
    tags: def.tags,
    summary: def.summary,
    operationId: def.operationId,
    description: def.description,
    ...(def.security !== undefined ? { security: def.security } : { security: [{ cookieAuth: [] }] }),
    ...(def.parameters ? { parameters: def.parameters } : {}),
    ...(def.requestBody ? { requestBody: def.requestBody } : {}),
    responses: {
      ...success(
        def.data ?? { type: 'object', additionalProperties: true },
        def.status ?? 200,
        def.responseDescription,
        def.example,
      ),
      ...standardErrors(def),
      ...(def.extraResponses || {}),
    },
  }
  if (def.permission) {
    operation['x-permission'] = def.permission
    operation.description = [operation.description, `Requires permission: \`${def.permission}\`.`]
      .filter(Boolean)
      .join(' ')
  }
  if (def.admin) {
    operation['x-admin'] = true
    operation.description = [
      operation.description,
      'Requires staff admin access (`role` ADMIN/SUPER_ADMIN or non-null `staffRole`).',
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (def.investor) {
    operation.description = [operation.description, 'Investor authentication (any authenticated user).']
      .filter(Boolean)
      .join(' ')
  }
  entry[method] = operation
}

function pub(method, path, def) {
  op(method, path, { ...def, security: [] })
}

function auth(method, path, def) {
  op(method, path, def)
}

function admin(method, path, def) {
  op(method, path, { ...def, admin: true })
}

const uuid = { type: 'string', format: 'uuid' }
const money = { type: 'string', pattern: '^\\d+(\\.\\d{1,8})?$', description: 'Decimal money string' }
const isoDate = { type: 'string', format: 'date' }
const isoDateTime = { type: 'string', format: 'date-time' }
const cursorQ = [
  { name: 'cursor', in: 'query', schema: { type: 'string' } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
]
const idParam = [{ name: 'id', in: 'path', required: true, schema: uuid }]
const signedDownloadParams = [
  { name: 'key', in: 'query', required: true, schema: { type: 'string' }, description: 'Storage object key' },
  { name: 'expires', in: 'query', required: true, schema: { type: 'string' }, description: 'Unix expiry (seconds)' },
  { name: 'signature', in: 'query', required: true, schema: { type: 'string' }, description: 'HMAC-SHA256 hex signature' },
]

// ── Root / Health ────────────────────────────────────────────────────────────

pub('get', '/', {
  tags: ['Health'],
  summary: 'Service tip',
  operationId: 'getRoot',
  data: {
    type: 'object',
    properties: {
      service: { type: 'string' },
      health: { type: 'string' },
      version: { type: 'string' },
    },
  },
})

pub('get', '/api/health', {
  tags: ['Health'],
  summary: 'Health check',
  operationId: 'getHealth',
  data: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['ok', 'degraded'] },
      database: { type: 'string', enum: ['up', 'down'] },
      uptimeSeconds: { type: 'number' },
      environment: { type: 'string' },
    },
  },
  extraResponses: {
    503: {
      description: 'Database down',
      content: { 'application/json': { schema: ref('ApiFailure') } },
    },
  },
})

pub('get', '/api/version', {
  tags: ['Health'],
  summary: 'API version',
  operationId: 'getVersion',
  data: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      version: { type: 'string' },
      api: { type: 'string' },
      node: { type: 'string' },
    },
  },
})

pub('get', '/api/docs', {
  tags: ['Health'],
  summary: 'Swagger UI',
  operationId: 'docsSwaggerUi',
  description: 'Interactive Swagger UI (HTML).',
})
paths['/api/docs'].get.responses = {
  200: { description: 'Swagger UI HTML', content: { 'text/html': { schema: { type: 'string' } } } },
}

pub('get', '/api/docs/json', {
  tags: ['Health'],
  summary: 'OpenAPI JSON (legacy path)',
  operationId: 'docsOpenApiJson',
  description: 'Same document as `/api/openapi.json`.',
})
paths['/api/docs/json'].get.responses = {
  200: { description: 'OpenAPI 3.1 document', content: { 'application/json': { schema: { type: 'object' } } } },
}

pub('get', '/api/openapi.json', {
  tags: ['Health'],
  summary: 'OpenAPI JSON',
  operationId: 'docsOpenApiJsonCanonical',
  description: 'Canonical OpenAPI 3.1 JSON document used by Swagger UI and Redoc.',
})
paths['/api/openapi.json'].get.responses = {
  200: { description: 'OpenAPI 3.1 document', content: { 'application/json': { schema: { type: 'object' } } } },
}

pub('get', '/api/docs/yaml', {
  tags: ['Health'],
  summary: 'OpenAPI YAML',
  operationId: 'docsOpenApiYaml',
})
paths['/api/docs/yaml'].get.responses = {
  200: { description: 'OpenAPI 3.1 document', content: { 'application/yaml': { schema: { type: 'string' } } } },
}

pub('get', '/api/redoc', {
  tags: ['Health'],
  summary: 'Redoc documentation',
  operationId: 'docsRedoc',
})
paths['/api/redoc'].get.responses = {
  200: { description: 'Redoc HTML', content: { 'text/html': { schema: { type: 'string' } } } },
}

// ── Auth ─────────────────────────────────────────────────────────────────────

pub('post', '/api/v1/auth/register', {
  tags: ['Auth'],
  summary: 'Register investor',
  operationId: 'authRegister',
  status: 201,
  requestBody: jsonBody(ref('RegisterRequest')),
  data: { type: 'object', properties: { userId: uuid } },
})

pub('post', '/api/v1/auth/login', {
  tags: ['Auth'],
  summary: 'Login (sets mfx_at, mfx_rt, mfx_csrf cookies)',
  operationId: 'authLogin',
  requestBody: jsonBody(ref('LoginRequest')),
  data: {
    type: 'object',
    properties: {
      user: ref('PublicUser'),
      wallet: { nullable: true },
    },
  },
})

pub('post', '/api/v1/auth/logout', {
  tags: ['Auth'],
  summary: 'Logout and clear auth cookies',
  operationId: 'authLogout',
  security: [],
  description: 'Uses optionalAuthenticate - works with or without a session.',
  data: { nullable: true },
})

pub('post', '/api/v1/auth/refresh', {
  tags: ['Auth'],
  summary: 'Refresh access token via mfx_rt cookie',
  operationId: 'authRefresh',
  security: [{ refreshCookie: [] }],
  data: { nullable: true },
})

auth('get', '/api/v1/auth/me', {
  tags: ['Auth'],
  summary: 'Current authenticated user',
  operationId: 'authMe',
  data: {
    type: 'object',
    properties: { user: ref('PublicUser'), wallet: { nullable: true } },
  },
})

pub('post', '/api/v1/auth/verify-email', {
  tags: ['Auth'],
  summary: 'Verify email with token',
  operationId: 'authVerifyEmail',
  requestBody: jsonBody({ type: 'object', required: ['token'], properties: { token: { type: 'string' } } }),
  data: { nullable: true },
})

pub('post', '/api/v1/auth/verify-email/resend', {
  tags: ['Auth'],
  summary: 'Resend verification email',
  operationId: 'authResendVerification',
  requestBody: jsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }),
  data: { nullable: true },
})

pub('post', '/api/v1/auth/forgot-password', {
  tags: ['Auth'],
  summary: 'Request password reset',
  operationId: 'authForgotPassword',
  requestBody: jsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }),
  data: { nullable: true },
})

pub('post', '/api/v1/auth/reset-password', {
  tags: ['Auth'],
  summary: 'Reset password with token',
  operationId: 'authResetPassword',
  requestBody: jsonBody({
    type: 'object',
    required: ['token', 'password'],
    properties: { token: { type: 'string' }, password: { type: 'string', minLength: 10, maxLength: 128 } },
  }),
  data: { nullable: true },
})

auth('post', '/api/v1/auth/change-password', {
  tags: ['Auth'],
  summary: 'Change password (clears cookies)',
  operationId: 'authChangePassword',
  requestBody: jsonBody({
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string' },
      newPassword: { type: 'string', minLength: 10, maxLength: 128 },
    },
  }),
  data: { nullable: true },
})

auth('get', '/api/v1/auth/sessions', {
  tags: ['Auth'],
  summary: 'List active sessions',
  operationId: 'authListSessions',
  data: { type: 'array', items: ref('SessionInfo') },
})

auth('delete', '/api/v1/auth/sessions/{id}', {
  tags: ['Auth'],
  summary: 'Revoke a session',
  operationId: 'authRevokeSession',
  parameters: idParam,
  notFound: true,
  data: { nullable: true },
})

// ── Users / Profile ──────────────────────────────────────────────────────────

auth('get', '/api/v1/users/me', {
  tags: ['Users'],
  summary: 'Get current user profile summary',
  operationId: 'usersMe',
  data: ref('PublicUser'),
})

auth('get', '/api/v1/profile', {
  tags: ['Profile'],
  summary: 'Get extended profile',
  operationId: 'profileGet',
  permission: 'profile.view',
  data: { type: 'object', additionalProperties: true },
})

auth('patch', '/api/v1/profile', {
  tags: ['Profile'],
  summary: 'Update profile',
  operationId: 'profileUpdate',
  permission: 'profile.edit',
  requestBody: jsonBody(ref('ProfileUpdateRequest')),
  data: { type: 'object', additionalProperties: true },
})

auth('post', '/api/v1/profile/avatar', {
  tags: ['Profile'],
  summary: 'Upload avatar (max 2MB)',
  operationId: 'profileUploadAvatar',
  permission: 'profile.edit',
  requestBody: multipartBody({ avatar: { type: 'string', format: 'binary' } }, ['avatar']),
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/profile/sessions', {
  tags: ['Profile'],
  summary: 'List profile sessions',
  operationId: 'profileListSessions',
  permission: 'sessions.manage',
  data: { type: 'array', items: ref('SessionInfo') },
})

auth('get', '/api/v1/profile/sessions/current', {
  tags: ['Profile'],
  summary: 'Current session',
  operationId: 'profileCurrentSession',
  permission: 'sessions.manage',
  data: ref('SessionInfo'),
})

auth('delete', '/api/v1/profile/sessions/others', {
  tags: ['Profile'],
  summary: 'Revoke all other sessions',
  operationId: 'profileRevokeOtherSessions',
  permission: 'sessions.manage',
  data: { nullable: true },
})

auth('delete', '/api/v1/profile/sessions/{id}', {
  tags: ['Profile'],
  summary: 'Revoke session by id',
  operationId: 'profileRevokeSession',
  permission: 'sessions.manage',
  parameters: idParam,
  notFound: true,
  data: { nullable: true },
})

// ── KYC ──────────────────────────────────────────────────────────────────────

pub('get', '/api/v1/kyc/files/download', {
  tags: ['KYC'],
  summary: 'Signed KYC file download',
  operationId: 'kycSignedDownload',
  parameters: signedDownloadParams,
  extraResponses: {
    200: {
      description: 'File stream',
      content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
    },
  },
  data: undefined,
})
// Fix binary response for signed download - override responses manually
paths['/api/v1/kyc/files/download'].get.responses = {
  200: {
    description: 'File stream (inline)',
    content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
  },
  400: respRef('ValidationError'),
  404: respRef('NotFound'),
}

auth('get', '/api/v1/kyc/status', {
  tags: ['KYC'],
  summary: 'KYC status',
  operationId: 'kycStatus',
  permission: 'kyc.view',
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/kyc/me', {
  tags: ['KYC'],
  summary: 'KYC status (alias)',
  operationId: 'kycMe',
  permission: 'kyc.view',
  data: { type: 'object', additionalProperties: true },
})

auth('patch', '/api/v1/kyc/update', {
  tags: ['KYC'],
  summary: 'Upsert KYC application fields',
  operationId: 'kycUpdate',
  permission: 'kyc.submit',
  requestBody: jsonBody(ref('KycUpdateRequest')),
  data: { type: 'object', additionalProperties: true },
})

auth('post', '/api/v1/kyc/submit', {
  tags: ['KYC'],
  summary: 'Submit KYC for review',
  operationId: 'kycSubmit',
  permission: 'kyc.submit',
  requestBody: jsonBody(ref('KycUpdateRequest'), false),
  data: { type: 'object', additionalProperties: true },
})

auth('post', '/api/v1/kyc/', {
  tags: ['KYC'],
  summary: 'Submit KYC (alias of /submit)',
  operationId: 'kycSubmitAlias',
  permission: 'kyc.submit',
  requestBody: jsonBody(ref('KycUpdateRequest'), false),
  data: { type: 'object', additionalProperties: true },
})

auth('post', '/api/v1/kyc/upload', {
  tags: ['KYC'],
  summary: 'Upload KYC document (max 8MB)',
  operationId: 'kycUpload',
  permission: 'kyc.submit',
  requestBody: multipartBody(
    {
      file: { type: 'string', format: 'binary' },
      documentType: { $ref: '#/components/schemas/KycDocumentType' },
      side: { $ref: '#/components/schemas/KycDocumentSide' },
    },
    ['file', 'documentType'],
  ),
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/kyc/history', {
  tags: ['KYC'],
  summary: 'KYC history',
  operationId: 'kycHistory',
  permission: 'kyc.view',
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/kyc/documents', {
  tags: ['KYC'],
  summary: 'List KYC documents',
  operationId: 'kycDocuments',
  permission: 'kyc.view',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

auth('delete', '/api/v1/kyc/document/{id}', {
  tags: ['KYC'],
  summary: 'Delete KYC document',
  operationId: 'kycDeleteDocument',
  permission: 'kyc.submit',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

// ── Wallet / Deposits / Withdrawals / Transactions ───────────────────────────

auth('get', '/api/v1/wallet', {
  tags: ['Wallet'],
  summary: 'Get wallet',
  operationId: 'walletGet',
  permission: 'wallet.view',
  data: ref('Wallet'),
})

auth('get', '/api/v1/wallet/summary', {
  tags: ['Wallet'],
  summary: 'Wallet summary with performance',
  operationId: 'walletSummary',
  permission: 'wallet.view',
  data: ref('WalletSummary'),
})

auth('get', '/api/v1/wallet/transactions', {
  tags: ['Wallet'],
  summary: 'Wallet transactions',
  operationId: 'walletTransactions',
  permission: 'wallet.view',
  parameters: [
    ...cursorQ,
    { name: 'status', in: 'query', schema: { type: 'string' } },
    { name: 'q', in: 'query', schema: { type: 'string' } },
    { name: 'from', in: 'query', schema: isoDateTime },
    { name: 'to', in: 'query', schema: isoDateTime },
  ],
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/wallet/history', {
  tags: ['Wallet'],
  summary: 'Wallet history',
  operationId: 'walletHistory',
  permission: 'wallet.view',
  parameters: cursorQ,
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/deposits/methods', {
  tags: ['Deposits'],
  summary: 'List deposit payment methods',
  operationId: 'depositMethods',
  permission: 'deposits.view',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

auth('get', '/api/v1/deposits', {
  tags: ['Deposits'],
  summary: 'List my deposits',
  operationId: 'depositsList',
  permission: 'deposits.view',
  parameters: [
    { name: 'status', in: 'query', schema: { type: 'string' } },
    ...cursorQ,
  ],
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/deposits/{id}', {
  tags: ['Deposits'],
  summary: 'Get deposit',
  operationId: 'depositsGet',
  permission: 'deposits.view',
  parameters: idParam,
  notFound: true,
  data: ref('Deposit'),
})

auth('post', '/api/v1/deposits', {
  tags: ['Deposits'],
  summary: 'Create deposit',
  operationId: 'depositsCreate',
  permission: 'deposits.create',
  requestBody: jsonBody({
    type: 'object',
    required: ['amount', 'methodId', 'idempotencyKey'],
    properties: {
      amount: money,
      methodId: uuid,
      userReference: { type: 'string' },
      txHash: { type: 'string' },
      idempotencyKey: { type: 'string' },
    },
  }),
  data: ref('Deposit'),
})

auth('post', '/api/v1/deposits/{id}/proof', {
  tags: ['Deposits'],
  summary: 'Upload deposit proof (max 5MB)',
  operationId: 'depositsUploadProof',
  permission: 'deposits.create',
  parameters: idParam,
  requestBody: multipartBody({ file: { type: 'string', format: 'binary' } }, ['file']),
  data: ref('Deposit'),
})

auth('post', '/api/v1/deposits/{id}/cancel', {
  tags: ['Deposits'],
  summary: 'Cancel deposit',
  operationId: 'depositsCancel',
  permission: 'deposits.create',
  parameters: idParam,
  data: ref('Deposit'),
})

auth('get', '/api/v1/withdrawals/limits', {
  tags: ['Withdrawals'],
  summary: 'Withdrawal limits',
  operationId: 'withdrawalLimits',
  permission: 'withdrawals.view',
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/withdrawals/methods', {
  tags: ['Withdrawals'],
  summary: 'Payout methods',
  operationId: 'withdrawalMethods',
  permission: 'withdrawals.view',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

auth('get', '/api/v1/withdrawals', {
  tags: ['Withdrawals'],
  summary: 'List my withdrawals',
  operationId: 'withdrawalsList',
  permission: 'withdrawals.view',
  parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, ...cursorQ],
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/withdrawals/{id}', {
  tags: ['Withdrawals'],
  summary: 'Get withdrawal',
  operationId: 'withdrawalsGet',
  permission: 'withdrawals.view',
  parameters: idParam,
  notFound: true,
  data: ref('Withdrawal'),
})

auth('post', '/api/v1/withdrawals', {
  tags: ['Withdrawals'],
  summary: 'Create withdrawal',
  operationId: 'withdrawalsCreate',
  permission: 'withdrawals.create',
  requestBody: jsonBody({
    type: 'object',
    required: ['amount', 'payoutMethodId', 'idempotencyKey'],
    properties: {
      amount: money,
      payoutMethodId: uuid,
      idempotencyKey: { type: 'string' },
    },
  }),
  data: ref('Withdrawal'),
})

auth('post', '/api/v1/withdrawals/{id}/cancel', {
  tags: ['Withdrawals'],
  summary: 'Cancel withdrawal',
  operationId: 'withdrawalsCancel',
  permission: 'withdrawals.create',
  parameters: idParam,
  data: ref('Withdrawal'),
})

auth('get', '/api/v1/transactions', {
  tags: ['Transactions'],
  summary: 'List transactions',
  operationId: 'transactionsList',
  permission: 'wallet.view',
  parameters: [
    ...cursorQ,
    { name: 'status', in: 'query', schema: { type: 'string' } },
    { name: 'q', in: 'query', schema: { type: 'string' } },
    { name: 'from', in: 'query', schema: isoDateTime },
    { name: 'to', in: 'query', schema: isoDateTime },
  ],
  data: { type: 'object', additionalProperties: true },
})

// ── Trades / Performance / Portfolio / Returns ───────────────────────────────

pub('get', '/api/v1/trades/public', {
  tags: ['Trades'],
  summary: 'Public trade tape',
  operationId: 'tradesPublic',
  data: { type: 'array', items: ref('Trade') },
})

auth('get', '/api/v1/trades', {
  tags: ['Trades'],
  summary: 'Investor trade list',
  operationId: 'tradesList',
  permission: 'trades.view',
  parameters: [
    { name: 'cursor', in: 'query', schema: { type: 'string' } },
    { name: 'outcome', in: 'query', schema: { $ref: '#/components/schemas/TradeOutcome' } },
    { name: 'limit', in: 'query', schema: { type: 'integer' } },
  ],
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/trades/pairs', {
  tags: ['Trades'],
  summary: 'Trade pairs catalog',
  operationId: 'tradesPairs',
  permission: 'trades.view',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

auth('get', '/api/v1/trades/stats', {
  tags: ['Trades'],
  summary: 'Trade stats',
  operationId: 'tradesStats',
  permission: 'trades.view',
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/trades/{id}', {
  tags: ['Trades'],
  summary: 'Get trade',
  operationId: 'tradesGet',
  permission: 'trades.view',
  parameters: idParam,
  notFound: true,
  data: ref('Trade'),
})

pub('get', '/api/v1/performance/public', {
  tags: ['Performance'],
  summary: 'Public performance summary',
  operationId: 'performancePublic',
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/performance/summary', {
  tags: ['Performance'],
  summary: 'Investor performance summary',
  operationId: 'performanceSummary',
  permission: 'performance.view',
  data: ref('PerformanceSummary'),
})

auth('get', '/api/v1/performance/series', {
  tags: ['Performance'],
  summary: 'Equity series',
  operationId: 'performanceSeries',
  permission: 'performance.view',
  parameters: [{ name: 'range', in: 'query', schema: { type: 'string', default: '30d' } }],
  data: {
    type: 'object',
    properties: {
      range: { type: 'string' },
      points: { type: 'array', items: ref('EquityPoint') },
    },
  },
})

auth('get', '/api/v1/performance/monthly', {
  tags: ['Performance'],
  summary: 'Monthly returns',
  operationId: 'performanceMonthly',
  permission: 'performance.view',
  data: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string' },
        returnPct: { type: 'string' },
        profit: { type: 'string' },
      },
    },
  },
})

auth('get', '/api/v1/performance/yearly', {
  tags: ['Performance'],
  summary: 'Yearly returns',
  operationId: 'performanceYearly',
  permission: 'performance.view',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

auth('get', '/api/v1/performance/distributions', {
  tags: ['Performance'],
  summary: 'Profit distributions',
  operationId: 'performanceDistributions',
  permission: 'performance.view',
  data: { type: 'object', properties: { items: { type: 'array', items: ref('ProfitDistribution') } } },
})

auth('get', '/api/v1/portfolio', {
  tags: ['Portfolio'],
  summary: 'Investor portfolio',
  operationId: 'portfolioGet',
  permission: 'performance.view',
  data: { type: 'object', additionalProperties: true },
})

auth('get', '/api/v1/returns', {
  tags: ['Returns'],
  summary: 'Investor daily returns',
  operationId: 'returnsList',
  permission: 'performance.view',
  data: { type: 'object', additionalProperties: true },
})

// ── Notifications / Support / Settings / Reports ─────────────────────────────

auth('get', '/api/v1/notifications', {
  tags: ['Notifications'],
  summary: 'List notifications',
  operationId: 'notificationsList',
  parameters: [
    { name: 'cursor', in: 'query', schema: { type: 'string' } },
    { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
  ],
  data: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('Notification') },
      nextCursor: { type: 'string', nullable: true },
    },
  },
})

auth('get', '/api/v1/notifications/unread-count', {
  tags: ['Notifications'],
  summary: 'Unread notification count',
  operationId: 'notificationsUnreadCount',
  data: { type: 'object', properties: { count: { type: 'integer' } } },
})

auth('post', '/api/v1/notifications/read-all', {
  tags: ['Notifications'],
  summary: 'Mark all notifications read',
  operationId: 'notificationsMarkAllRead',
  data: { nullable: true },
})

auth('post', '/api/v1/notifications/{id}/read', {
  tags: ['Notifications'],
  summary: 'Mark notification read',
  operationId: 'notificationsMarkRead',
  parameters: idParam,
  notFound: true,
  data: ref('Notification'),
})

auth('delete', '/api/v1/notifications/{id}', {
  tags: ['Notifications'],
  summary: 'Archive notification',
  operationId: 'notificationsArchive',
  parameters: idParam,
  data: { nullable: true },
})

auth('get', '/api/v1/support/tickets', {
  tags: ['Support'],
  summary: 'List my support tickets',
  operationId: 'supportListMine',
  data: { type: 'object', properties: { items: { type: 'array', items: ref('SupportTicket') } } },
})

auth('post', '/api/v1/support/tickets', {
  tags: ['Support'],
  summary: 'Create support ticket',
  operationId: 'supportCreate',
  status: 201,
  requestBody: jsonBody({
    type: 'object',
    required: ['subject', 'body'],
    properties: {
      subject: { type: 'string' },
      body: { type: 'string' },
      category: { $ref: '#/components/schemas/SupportCategory' },
    },
  }),
  data: ref('SupportTicket'),
})

auth('get', '/api/v1/support/tickets/{id}', {
  tags: ['Support'],
  summary: 'Get ticket with messages',
  operationId: 'supportGet',
  parameters: idParam,
  notFound: true,
  data: ref('SupportTicket'),
})

auth('post', '/api/v1/support/tickets/{id}/messages', {
  tags: ['Support'],
  summary: 'Reply to ticket',
  operationId: 'supportReply',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string' } },
  }),
  data: ref('SupportTicket'),
})

pub('get', '/api/v1/settings/public', {
  tags: ['Settings'],
  summary: 'Public platform settings',
  operationId: 'settingsPublic',
  data: ref('PublicSettings'),
})

auth('get', '/api/v1/settings/me', {
  tags: ['Settings'],
  summary: 'My settings preferences',
  operationId: 'settingsMe',
  data: { type: 'object', additionalProperties: true },
})

auth('patch', '/api/v1/settings/me', {
  tags: ['Settings'],
  summary: 'Update my settings',
  operationId: 'settingsUpdateMe',
  requestBody: jsonBody({
    type: 'object',
    properties: {
      timezone: { type: 'string' },
      language: { type: 'string' },
      marketingOptIn: { type: 'boolean' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

auth('post', '/api/v1/reports/export', {
  tags: ['Reports'],
  summary: 'Export investor report',
  operationId: 'reportsExport',
  status: 201,
  requestBody: jsonBody(ref('ReportExportRequest')),
  data: {
    type: 'object',
    properties: {
      jobId: { type: 'string' },
      downloadUrl: { type: 'string' },
    },
  },
})

// ── CMS ──────────────────────────────────────────────────────────────────────

pub('get', '/api/v1/cms/public', {
  tags: ['CMS'],
  summary: 'Public CMS bootstrap',
  operationId: 'cmsPublicBootstrap',
  data: ref('CmsPublicBootstrap'),
})

pub('get', '/api/v1/cms/public/announcements', {
  tags: ['CMS'],
  summary: 'Active public announcements',
  operationId: 'cmsPublicAnnouncements',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

pub('get', '/api/v1/cms/public/pages/{slug}', {
  tags: ['CMS'],
  summary: 'Public CMS page by slug',
  operationId: 'cmsPublicPage',
  parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

auth('post', '/api/v1/cms/public/revisions/{revisionId}/rollback', {
  tags: ['CMS'],
  summary: 'Rollback CMS revision',
  operationId: 'cmsRollback',
  permission: 'cms.manage',
  parameters: [{ name: 'revisionId', in: 'path', required: true, schema: { type: 'string' } }],
  data: { type: 'object', additionalProperties: true },
})

const cmsContentBody = jsonBody({ type: 'object', additionalProperties: true })

auth('get', '/api/v1/cms/landing', {
  tags: ['CMS'],
  summary: 'Get landing CMS document',
  operationId: 'cmsGetLanding',
  permission: 'cms.view',
  data: { type: 'object', additionalProperties: true },
})
auth('put', '/api/v1/cms/landing', {
  tags: ['CMS'],
  summary: 'Update landing draft',
  operationId: 'cmsUpdateLanding',
  permission: 'cms.manage',
  requestBody: cmsContentBody,
  data: { type: 'object', additionalProperties: true },
})
auth('post', '/api/v1/cms/landing/autosave', {
  tags: ['CMS'],
  summary: 'Autosave landing draft',
  operationId: 'cmsAutosaveLanding',
  permission: 'cms.manage',
  requestBody: cmsContentBody,
  data: { type: 'object', additionalProperties: true },
})
auth('post', '/api/v1/cms/landing/publish', {
  tags: ['CMS'],
  summary: 'Publish landing',
  operationId: 'cmsPublishLanding',
  permission: 'cms.manage',
  requestBody: jsonBody({ type: 'object', properties: { content: { type: 'object', additionalProperties: true } } }, false),
  data: { type: 'object', additionalProperties: true },
})
auth('post', '/api/v1/cms/landing/schedule', {
  tags: ['CMS'],
  summary: 'Schedule landing publish',
  operationId: 'cmsScheduleLanding',
  permission: 'cms.manage',
  requestBody: jsonBody({
    type: 'object',
    required: ['content', 'scheduledAt'],
    properties: {
      content: { type: 'object', additionalProperties: true },
      scheduledAt: isoDateTime,
    },
  }),
  data: { type: 'object', additionalProperties: true },
})
auth('get', '/api/v1/cms/landing/revisions', {
  tags: ['CMS'],
  summary: 'Landing revision history',
  operationId: 'cmsLandingRevisions',
  permission: 'cms.view',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

auth('get', '/api/v1/cms/platform', {
  tags: ['CMS'],
  summary: 'Get platform CMS',
  operationId: 'cmsGetPlatform',
  permission: 'cms.view',
  data: ref('PlatformCmsDocument'),
})
auth('put', '/api/v1/cms/platform', {
  tags: ['CMS'],
  summary: 'Update platform draft',
  operationId: 'cmsUpdatePlatform',
  permission: 'cms.manage',
  requestBody: cmsContentBody,
  data: ref('PlatformCmsDocument'),
})
auth('post', '/api/v1/cms/platform/publish', {
  tags: ['CMS'],
  summary: 'Publish platform CMS',
  operationId: 'cmsPublishPlatform',
  permission: 'cms.manage',
  requestBody: cmsContentBody,
  data: ref('PlatformCmsDocument'),
})
auth('get', '/api/v1/cms/platform/revisions', {
  tags: ['CMS'],
  summary: 'Platform revision history',
  operationId: 'cmsPlatformRevisions',
  permission: 'cms.view',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

auth('get', '/api/v1/cms/publish-logs', {
  tags: ['CMS'],
  summary: 'CMS publish log',
  operationId: 'cmsPublishLogs',
  permission: 'cms.view',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

function cmsCrud(resource, tag, singular) {
  const base = `/api/v1/cms/${resource}`
  auth('get', base, {
    tags: [tag],
    summary: `List ${resource}`,
    operationId: `cmsList${singular}`,
    permission: 'cms.view',
    parameters: [{ name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } }],
    data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
  })
  auth('post', base, {
    tags: [tag],
    summary: `Create ${singular}`,
    operationId: `cmsCreate${singular}`,
    permission: 'cms.manage',
    status: 201,
    requestBody: cmsContentBody,
    data: { type: 'object', additionalProperties: true },
  })
  auth('patch', `${base}/{id}`, {
    tags: [tag],
    summary: `Update ${singular}`,
    operationId: `cmsUpdate${singular}`,
    permission: 'cms.manage',
    parameters: idParam,
    requestBody: cmsContentBody,
    data: { type: 'object', additionalProperties: true },
  })
  auth('delete', `${base}/{id}`, {
    tags: [tag],
    summary: `Soft-delete ${singular}`,
    operationId: `cmsDelete${singular}`,
    permission: 'cms.manage',
    parameters: idParam,
    data: { type: 'object', additionalProperties: true },
  })
  auth('post', `${base}/{id}/restore`, {
    tags: [tag],
    summary: `Restore ${singular}`,
    operationId: `cmsRestore${singular}`,
    permission: 'cms.manage',
    parameters: idParam,
    data: { type: 'object', additionalProperties: true },
  })
}

cmsCrud('faqs', 'CMS', 'Faq')
cmsCrud('testimonials', 'CMS', 'Testimonial')
cmsCrud('announcements', 'CMS', 'Announcement')

auth('get', '/api/v1/cms/pages', {
  tags: ['CMS'],
  summary: 'List CMS pages',
  operationId: 'cmsListPages',
  permission: 'cms.view',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})
auth('get', '/api/v1/cms/pages/{slug}', {
  tags: ['CMS'],
  summary: 'Get CMS page (staff)',
  operationId: 'cmsGetPage',
  permission: 'cms.view',
  parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
  data: { type: 'object', additionalProperties: true },
})
auth('put', '/api/v1/cms/pages/{slug}', {
  tags: ['CMS'],
  summary: 'Upsert CMS page',
  operationId: 'cmsUpsertPage',
  permission: 'cms.manage',
  parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
  requestBody: jsonBody({
    type: 'object',
    required: ['title', 'body'],
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
      status: { $ref: '#/components/schemas/CmsStatus' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

// ── Files / Email tracking ───────────────────────────────────────────────────

pub('get', '/api/v1/files/download', {
  tags: ['Files'],
  summary: 'Signed download for reports/ and media/ keys',
  operationId: 'filesDownload',
  parameters: signedDownloadParams,
})
paths['/api/v1/files/download'].get.responses = {
  200: {
    description: 'File attachment',
    content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
  },
  400: respRef('ValidationError'),
  404: respRef('NotFound'),
}

pub('get', '/api/v1/emails/o/{token}', {
  tags: ['EmailTracking'],
  summary: 'Email open tracking pixel',
  operationId: 'emailOpenTrack',
  parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
})
paths['/api/v1/emails/o/{token}'].get.responses = {
  200: {
    description: '1×1 GIF',
    content: { 'image/gif': { schema: { type: 'string', format: 'binary' } } },
  },
}

pub('get', '/api/v1/emails/c/{token}', {
  tags: ['EmailTracking'],
  summary: 'Email click tracking redirect',
  operationId: 'emailClickTrack',
  parameters: [
    { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
    { name: 'url', in: 'query', schema: { type: 'string' } },
  ],
})
paths['/api/v1/emails/c/{token}'].get.responses = {
  302: { description: 'Redirect to destination URL' },
}

// ── Admin core ───────────────────────────────────────────────────────────────

admin('get', '/api/v1/admin/dashboard', {
  tags: ['Admin'],
  summary: 'Admin dashboard summary',
  operationId: 'adminDashboard',
  permission: 'dashboard.view',
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/activity', {
  tags: ['Admin'],
  summary: 'Activity log',
  operationId: 'adminActivity',
  permission: 'activity.view',
  parameters: [
    paramRef('Page'),
    paramRef('Limit'),
    { name: 'cursor', in: 'query', schema: { type: 'string' } },
    { name: 'userId', in: 'query', schema: uuid },
    { name: 'kind', in: 'query', schema: { type: 'string' } },
    { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
  ],
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/audit', {
  tags: ['Admin'],
  summary: 'Audit log',
  operationId: 'adminAudit',
  permission: 'audit.view',
  parameters: [
    paramRef('Page'),
    paramRef('Limit'),
    paramRef('Q'),
    { name: 'cursor', in: 'query', schema: { type: 'string' } },
    { name: 'module', in: 'query', schema: { type: 'string' } },
    { name: 'action', in: 'query', schema: { type: 'string' } },
    { name: 'actorId', in: 'query', schema: uuid },
    { name: 'targetUserId', in: 'query', schema: uuid },
    paramRef('From'),
    paramRef('To'),
    { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
  ],
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/roles', {
  tags: ['Admin'],
  summary: 'Role catalog',
  operationId: 'adminRoles',
  permission: 'roles.view',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

admin('get', '/api/v1/admin/ops/metrics', {
  tags: ['Admin'],
  summary: 'Business ops metrics',
  operationId: 'adminOpsMetrics',
  permission: 'dashboard.view',
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/users', {
  tags: ['AdminUsers'],
  summary: 'List users',
  operationId: 'adminUsersList',
  permission: 'users.view',
  parameters: [
    paramRef('Page'),
    paramRef('Limit'),
    paramRef('Q'),
    paramRef('From'),
    paramRef('To'),
    { name: 'cursor', in: 'query', schema: { type: 'string' } },
    { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/UserStatus' } },
    { name: 'role', in: 'query', schema: { $ref: '#/components/schemas/Role' } },
    { name: 'kycStatus', in: 'query', schema: { $ref: '#/components/schemas/KycStatus' } },
    { name: 'emailVerified', in: 'query', schema: { type: 'boolean' } },
    { name: 'country', in: 'query', schema: { type: 'string' } },
    { name: 'phone', in: 'query', schema: { type: 'string' } },
    { name: 'referralCode', in: 'query', schema: { type: 'string' } },
    { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } },
    { name: 'sortBy', in: 'query', schema: { type: 'string' } },
    { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
  ],
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/users/{id}', {
  tags: ['AdminUsers'],
  summary: 'Get user',
  operationId: 'adminUsersGet',
  permission: 'users.view',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/users/{id}', {
  tags: ['AdminUsers'],
  summary: 'Update user',
  operationId: 'adminUsersUpdate',
  permission: 'users.edit',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: 'string' },
      country: { type: 'string' },
      timezone: { type: 'string' },
      role: { $ref: '#/components/schemas/Role' },
      staffRole: { $ref: '#/components/schemas/StaffRole' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

const reasonBody = jsonBody({ type: 'object', properties: { reason: { type: 'string' } } }, false)

for (const [action, perm, opId] of [
  ['disable', 'users.suspend', 'adminUsersDisable'],
  ['enable', 'users.suspend', 'adminUsersEnable'],
  ['suspend', 'users.suspend', 'adminUsersSuspend'],
  ['block', 'users.suspend', 'adminUsersBlock'],
  ['delete', 'users.delete', 'adminUsersDelete'],
]) {
  admin('post', `/api/v1/admin/users/{id}/${action}`, {
    tags: ['AdminUsers'],
    summary: `${action[0].toUpperCase()}${action.slice(1)} user`,
    operationId: opId,
    permission: perm,
    parameters: idParam,
    requestBody: reasonBody,
    data: { type: 'object', additionalProperties: true },
  })
}

admin('delete', '/api/v1/admin/users/{id}', {
  tags: ['AdminUsers'],
  summary: 'Delete user (alias)',
  operationId: 'adminUsersDeleteAlias',
  permission: 'users.delete',
  parameters: idParam,
  requestBody: reasonBody,
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/users/{id}/restore', {
  tags: ['AdminUsers'],
  summary: 'Restore user',
  operationId: 'adminUsersRestore',
  permission: 'users.restore',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/users/{id}/force-logout', {
  tags: ['AdminUsers'],
  summary: 'Force logout user',
  operationId: 'adminUsersForceLogout',
  permission: 'users.suspend',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

// ── Admin KYC ────────────────────────────────────────────────────────────────

admin('get', '/api/v1/admin/kyc/metrics', {
  tags: ['AdminKYC'],
  summary: 'KYC metrics',
  operationId: 'adminKycMetrics',
  permission: 'kyc.view',
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/kyc', {
  tags: ['AdminKYC'],
  summary: 'List KYC submissions',
  operationId: 'adminKycList',
  permission: 'kyc.view',
  parameters: [paramRef('Page'), paramRef('Limit'), paramRef('Q'), paramRef('Status')],
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/kyc/{id}', {
  tags: ['AdminKYC'],
  summary: 'Get KYC submission',
  operationId: 'adminKycGet',
  permission: 'kyc.view',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

const kycReviewBody = jsonBody(ref('KycReviewRequest'), false)

for (const [action, opId] of [
  ['approve', 'adminKycApprove'],
  ['reject', 'adminKycReject'],
  ['request-information', 'adminKycRequestInfo'],
  ['expire', 'adminKycExpire'],
  ['reopen', 'adminKycReopen'],
  ['suspend', 'adminKycSuspend'],
]) {
  admin('post', `/api/v1/admin/kyc/{id}/${action}`, {
    tags: ['AdminKYC'],
    summary: `KYC ${action}`,
    operationId: opId,
    permission: 'kyc.review',
    parameters: idParam,
    requestBody: kycReviewBody,
    data: { type: 'object', additionalProperties: true },
  })
}

admin('post', '/api/v1/admin/kyc/{id}/review', {
  tags: ['AdminKYC'],
  summary: 'KYC review (compat)',
  operationId: 'adminKycReview',
  permission: 'kyc.review',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['decision'],
    properties: {
      decision: { type: 'string', enum: ['APPROVE', 'REJECT'] },
      reason: { type: 'string' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

// ── Admin Finance ────────────────────────────────────────────────────────────

const financeListParams = [
  paramRef('Page'),
  paramRef('Limit'),
  paramRef('Q'),
  paramRef('Status'),
  paramRef('From'),
  paramRef('To'),
  { name: 'cursor', in: 'query', schema: { type: 'string' } },
  { name: 'paymentMethodId', in: 'query', schema: uuid },
  { name: 'reviewerId', in: 'query', schema: uuid },
  { name: 'minAmount', in: 'query', schema: { type: 'string' } },
  { name: 'maxAmount', in: 'query', schema: { type: 'string' } },
]

admin('get', '/api/v1/admin/finance/metrics', {
  tags: ['AdminFinance'],
  summary: 'Finance metrics',
  operationId: 'adminFinanceMetrics',
  permission: 'finance.view',
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/wallets', {
  tags: ['AdminFinance'],
  summary: 'List wallets',
  operationId: 'adminWalletsList',
  permission: 'finance.view',
  parameters: financeListParams,
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/wallets/{id}/adjust', {
  tags: ['AdminFinance'],
  summary: 'Adjust wallet balance',
  operationId: 'adminWalletAdjust',
  permission: 'finance.adjust',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['amount', 'direction', 'reason'],
    properties: {
      amount: money,
      direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
      reason: { type: 'string' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/deposits', {
  tags: ['AdminFinance'],
  summary: 'Admin list deposits',
  operationId: 'adminDepositsList',
  permission: 'finance.view',
  parameters: financeListParams,
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/deposits/{id}', {
  tags: ['AdminFinance'],
  summary: 'Admin get deposit',
  operationId: 'adminDepositsGet',
  permission: 'finance.view',
  parameters: idParam,
  notFound: true,
  data: ref('Deposit'),
})

admin('post', '/api/v1/admin/deposits/{id}/review', {
  tags: ['AdminFinance'],
  summary: 'Review deposit',
  operationId: 'adminDepositsReview',
  permission: 'finance.review',
  parameters: idParam,
  requestBody: jsonBody(ref('DepositReviewRequest')),
  data: ref('Deposit'),
})

admin('post', '/api/v1/admin/deposits/{id}/approve', {
  tags: ['AdminFinance'],
  summary: 'Approve deposit',
  operationId: 'adminDepositsApprove',
  permission: 'finance.review',
  parameters: idParam,
  requestBody: jsonBody(ref('DepositReviewRequest'), false),
  data: ref('Deposit'),
})

admin('post', '/api/v1/admin/deposits/{id}/reject', {
  tags: ['AdminFinance'],
  summary: 'Reject deposit',
  operationId: 'adminDepositsReject',
  permission: 'finance.review',
  parameters: idParam,
  requestBody: jsonBody(ref('DepositReviewRequest'), false),
  data: ref('Deposit'),
})

admin('get', '/api/v1/admin/withdrawals', {
  tags: ['AdminFinance'],
  summary: 'Admin list withdrawals',
  operationId: 'adminWithdrawalsList',
  permission: 'finance.view',
  parameters: financeListParams,
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/withdrawals/{id}', {
  tags: ['AdminFinance'],
  summary: 'Admin get withdrawal',
  operationId: 'adminWithdrawalsGet',
  permission: 'finance.view',
  parameters: idParam,
  notFound: true,
  data: ref('Withdrawal'),
})

admin('post', '/api/v1/admin/withdrawals/{id}/review', {
  tags: ['AdminFinance'],
  summary: 'Review withdrawal',
  operationId: 'adminWithdrawalsReview',
  permission: 'finance.review',
  parameters: idParam,
  requestBody: jsonBody(ref('WithdrawalReviewRequest')),
  data: ref('Withdrawal'),
})

for (const [action, opId] of [
  ['approve', 'adminWithdrawalsApprove'],
  ['reject', 'adminWithdrawalsReject'],
  ['mark-paid', 'adminWithdrawalsMarkPaid'],
]) {
  admin('post', `/api/v1/admin/withdrawals/{id}/${action}`, {
    tags: ['AdminFinance'],
    summary: `Withdrawal ${action}`,
    operationId: opId,
    permission: 'finance.review',
    parameters: idParam,
    requestBody: jsonBody(ref('WithdrawalReviewRequest'), false),
    data: ref('Withdrawal'),
  })
}

admin('get', '/api/v1/admin/payment-methods', {
  tags: ['AdminFinance'],
  summary: 'List payment methods',
  operationId: 'adminPaymentMethodsList',
  permission: 'finance.manage',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

admin('post', '/api/v1/admin/payment-methods', {
  tags: ['AdminFinance'],
  summary: 'Create payment method',
  operationId: 'adminPaymentMethodsCreate',
  permission: 'finance.manage',
  requestBody: jsonBody({ type: 'object', additionalProperties: true }),
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/payment-methods/{id}', {
  tags: ['AdminFinance'],
  summary: 'Update payment method',
  operationId: 'adminPaymentMethodsUpdate',
  permission: 'finance.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', additionalProperties: true }),
  data: { type: 'object', additionalProperties: true },
})

admin('delete', '/api/v1/admin/payment-methods/{id}', {
  tags: ['AdminFinance'],
  summary: 'Delete payment method',
  operationId: 'adminPaymentMethodsDelete',
  permission: 'finance.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/wallet-addresses', {
  tags: ['AdminFinance'],
  summary: 'List wallet addresses',
  operationId: 'adminWalletAddressesList',
  permission: 'finance.manage',
  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
})

admin('post', '/api/v1/admin/wallet-addresses', {
  tags: ['AdminFinance'],
  summary: 'Create wallet address',
  operationId: 'adminWalletAddressesCreate',
  permission: 'finance.manage',
  requestBody: jsonBody({ type: 'object', additionalProperties: true }),
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/wallet-addresses/{id}', {
  tags: ['AdminFinance'],
  summary: 'Update wallet address',
  operationId: 'adminWalletAddressesUpdate',
  permission: 'finance.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', additionalProperties: true }),
  data: { type: 'object', additionalProperties: true },
})

admin('delete', '/api/v1/admin/wallet-addresses/{id}', {
  tags: ['AdminFinance'],
  summary: 'Delete wallet address',
  operationId: 'adminWalletAddressesDelete',
  permission: 'finance.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/ledger', {
  tags: ['AdminFinance'],
  summary: 'Ledger entries',
  operationId: 'adminLedger',
  permission: 'finance.view',
  parameters: financeListParams,
  data: { type: 'object', additionalProperties: true },
})

// ── Admin Trading ────────────────────────────────────────────────────────────

admin('get', '/api/v1/admin/trades', {
  tags: ['AdminTrading'],
  summary: 'Admin list trades',
  operationId: 'adminTradesList',
  permission: 'trades.manage',
  parameters: [paramRef('Page'), paramRef('Limit'), paramRef('Q'), paramRef('Status')],
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/trades', {
  tags: ['AdminTrading'],
  summary: 'Create trade',
  operationId: 'adminTradesCreate',
  permission: 'trades.manage',
  requestBody: jsonBody(ref('CreateTradeRequest')),
  data: ref('Trade'),
})

admin('post', '/api/v1/admin/trades/allocate', {
  tags: ['AdminTrading'],
  summary: 'Allocate trade to investors',
  operationId: 'adminTradesAllocate',
  permission: 'trades.manage',
  requestBody: jsonBody({
    type: 'object',
    required: ['tradeId', 'mode'],
    properties: {
      tradeId: uuid,
      mode: { type: 'string', enum: ['EQUAL', 'PERCENTAGE', 'CAPITAL', 'MANUAL'] },
      userIds: { type: 'array', items: uuid },
      allocations: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/trades/publish', {
  tags: ['AdminTrading'],
  summary: 'Batch publish trades',
  operationId: 'adminTradesPublishBatch',
  permission: 'trades.manage',
  requestBody: jsonBody({
    type: 'object',
    properties: { tradeIds: { type: 'array', items: uuid } },
  }, false),
  data: { type: 'object', properties: { items: { type: 'array', items: ref('Trade') } } },
})

admin('get', '/api/v1/admin/trades/{id}', {
  tags: ['AdminTrading'],
  summary: 'Admin get trade',
  operationId: 'adminTradesGet',
  permission: 'trades.manage',
  parameters: idParam,
  notFound: true,
  data: ref('Trade'),
})

admin('patch', '/api/v1/admin/trades/{id}', {
  tags: ['AdminTrading'],
  summary: 'Update trade',
  operationId: 'adminTradesUpdate',
  permission: 'trades.manage',
  parameters: idParam,
  requestBody: jsonBody(ref('CreateTradeRequest'), false),
  data: ref('Trade'),
})

for (const [action, opId, hasBody] of [
  ['open', 'adminTradesOpen', false],
  ['close', 'adminTradesClose', true],
  ['cancel', 'adminTradesCancel', false],
  ['archive', 'adminTradesArchive', false],
  ['duplicate', 'adminTradesDuplicate', false],
  ['publish', 'adminTradesPublish', false],
  ['hide', 'adminTradesHide', false],
]) {
  admin('post', `/api/v1/admin/trades/{id}/${action}`, {
    tags: ['AdminTrading'],
    summary: `Trade ${action}`,
    operationId: opId,
    permission: 'trades.manage',
    parameters: idParam,
    ...(hasBody
      ? {
          requestBody: jsonBody({
            type: 'object',
            properties: {
              exitPrice: { type: 'string' },
              returnPct: { type: 'string' },
              adminNotes: { type: 'string' },
            },
          }, false),
        }
      : {}),
    data: ref('Trade'),
  })
}

admin('get', '/api/v1/admin/returns', {
  tags: ['AdminTrading'],
  summary: 'List daily return runs',
  operationId: 'adminReturnsList',
  permission: 'returns.manage',
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/returns', {
  tags: ['AdminTrading'],
  summary: 'Publish daily return',
  operationId: 'adminReturnsPublish',
  permission: 'returns.manage',
  requestBody: jsonBody({
    type: 'object',
    required: ['date', 'returnPct', 'idempotencyKey'],
    properties: {
      date: isoDate,
      returnPct: { type: 'string' },
      idempotencyKey: { type: 'string' },
      returnBasis: { type: 'string', enum: ['BALANCE', 'INVESTED'] },
      preview: { type: 'boolean' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/performance', {
  tags: ['AdminTrading'],
  summary: 'Admin performance overview',
  operationId: 'adminPerformance',
  permission: 'performance.view',
  data: { type: 'object', additionalProperties: true },
})

// ── Admin Media ──────────────────────────────────────────────────────────────

admin('get', '/api/v1/admin/media', {
  tags: ['AdminMedia'],
  summary: 'List media assets',
  operationId: 'adminMediaList',
  permission: 'media.manage',
  parameters: [
    paramRef('Page'),
    paramRef('Limit'),
    paramRef('Q'),
    { name: 'folder', in: 'query', schema: { type: 'string' } },
    { name: 'kind', in: 'query', schema: { $ref: '#/components/schemas/MediaKind' } },
    { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } },
  ],
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/media/upload', {
  tags: ['AdminMedia'],
  summary: 'Upload media (max 20MB)',
  operationId: 'adminMediaUpload',
  permission: 'media.manage',
  status: 201,
  requestBody: multipartBody(
    {
      file: { type: 'string', format: 'binary' },
      folder: { type: 'string' },
    },
    ['file'],
  ),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/media/folders', {
  tags: ['AdminMedia'],
  summary: 'List media folders',
  operationId: 'adminMediaFolders',
  permission: 'media.manage',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' } } } },
})

admin('get', '/api/v1/admin/media/{id}', {
  tags: ['AdminMedia'],
  summary: 'Get media asset',
  operationId: 'adminMediaGet',
  permission: 'media.manage',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/media/{id}/rename', {
  tags: ['AdminMedia'],
  summary: 'Rename media',
  operationId: 'adminMediaRename',
  permission: 'media.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string' } } }),
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/media/{id}/move', {
  tags: ['AdminMedia'],
  summary: 'Move media to folder',
  operationId: 'adminMediaMove',
  permission: 'media.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', required: ['folder'], properties: { folder: { type: 'string' } } }),
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/media/{id}/metadata', {
  tags: ['AdminMedia'],
  summary: 'Update media metadata',
  operationId: 'adminMediaMetadata',
  permission: 'media.manage',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    properties: { description: { type: 'string' }, usedBy: { type: 'string' } },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/media/{id}/restore', {
  tags: ['AdminMedia'],
  summary: 'Restore media',
  operationId: 'adminMediaRestore',
  permission: 'media.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('delete', '/api/v1/admin/media/{id}', {
  tags: ['AdminMedia'],
  summary: 'Soft-delete media',
  operationId: 'adminMediaSoftDelete',
  permission: 'media.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('delete', '/api/v1/admin/media/{id}/permanent', {
  tags: ['AdminMedia'],
  summary: 'Permanently delete media',
  operationId: 'adminMediaPermanentDelete',
  permission: 'media.manage',
  parameters: idParam,
  data: { nullable: true },
})

// ── Admin Support ────────────────────────────────────────────────────────────

admin('get', '/api/v1/admin/support', {
  tags: ['AdminSupport'],
  summary: 'List support tickets',
  operationId: 'adminSupportList',
  permission: 'support.view',
  parameters: [
    paramRef('Q'),
    { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/SupportStatus' } },
    { name: 'priority', in: 'query', schema: { $ref: '#/components/schemas/SupportPriority' } },
    { name: 'category', in: 'query', schema: { $ref: '#/components/schemas/SupportCategory' } },
    { name: 'assigneeId', in: 'query', schema: uuid },
  ],
  data: { type: 'object', properties: { items: { type: 'array', items: ref('SupportTicket') } } },
})

admin('get', '/api/v1/admin/support/metrics', {
  tags: ['AdminSupport'],
  summary: 'Support metrics',
  operationId: 'adminSupportMetrics',
  permission: 'support.view',
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/support/{id}', {
  tags: ['AdminSupport'],
  summary: 'Get support ticket',
  operationId: 'adminSupportGet',
  permission: 'support.view',
  parameters: idParam,
  notFound: true,
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/messages', {
  tags: ['AdminSupport'],
  summary: 'Admin reply',
  operationId: 'adminSupportReply',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', required: ['message'], properties: { message: { type: 'string' } } }),
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/assign', {
  tags: ['AdminSupport'],
  summary: 'Assign agent',
  operationId: 'adminSupportAssign',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['assigneeId'],
    properties: { assigneeId: { oneOf: [uuid, { type: 'null' }] } },
  }),
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/priority', {
  tags: ['AdminSupport'],
  summary: 'Set priority',
  operationId: 'adminSupportPriority',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['priority'],
    properties: { priority: { $ref: '#/components/schemas/SupportPriority' } },
  }),
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/category', {
  tags: ['AdminSupport'],
  summary: 'Set category',
  operationId: 'adminSupportCategory',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['category'],
    properties: { category: { $ref: '#/components/schemas/SupportCategory' } },
  }),
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/notes', {
  tags: ['AdminSupport'],
  summary: 'Add internal note',
  operationId: 'adminSupportNotes',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', required: ['note'], properties: { note: { type: 'string' } } }),
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/close', {
  tags: ['AdminSupport'],
  summary: 'Close ticket',
  operationId: 'adminSupportClose',
  permission: 'support.manage',
  parameters: idParam,
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/reopen', {
  tags: ['AdminSupport'],
  summary: 'Reopen ticket',
  operationId: 'adminSupportReopen',
  permission: 'support.manage',
  parameters: idParam,
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/merge', {
  tags: ['AdminSupport'],
  summary: 'Merge tickets',
  operationId: 'adminSupportMerge',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', required: ['targetId'], properties: { targetId: uuid } }),
  data: ref('SupportTicket'),
})

admin('post', '/api/v1/admin/support/{id}/transfer', {
  tags: ['AdminSupport'],
  summary: 'Transfer ticket',
  operationId: 'adminSupportTransfer',
  permission: 'support.manage',
  parameters: idParam,
  requestBody: jsonBody({ type: 'object', required: ['assigneeId'], properties: { assigneeId: uuid } }),
  data: ref('SupportTicket'),
})

// ── Admin Settings / Reports / Broadcasts / Announcements / Emails ───────────

admin('get', '/api/v1/admin/settings', {
  tags: ['AdminSettings'],
  summary: 'Get platform settings',
  operationId: 'adminSettingsGet',
  permission: 'settings.manage',
  data: ref('PlatformSettings'),
})

admin('put', '/api/v1/admin/settings', {
  tags: ['AdminSettings'],
  summary: 'Update platform settings',
  operationId: 'adminSettingsUpdate',
  permission: 'settings.manage',
  requestBody: jsonBody(ref('PlatformSettingsUpdate')),
  data: ref('PlatformSettings'),
})

admin('get', '/api/v1/admin/feature-flags', {
  tags: ['AdminSettings'],
  summary: 'Get feature flags',
  operationId: 'adminFeatureFlagsGet',
  permission: 'settings.manage',
  data: { type: 'object', additionalProperties: { type: 'boolean' } },
})

admin('put', '/api/v1/admin/feature-flags', {
  tags: ['AdminSettings'],
  summary: 'Update feature flags',
  operationId: 'adminFeatureFlagsUpdate',
  permission: 'settings.manage',
  requestBody: jsonBody({ type: 'object', additionalProperties: { type: 'boolean' } }),
  data: { type: 'object', additionalProperties: { type: 'boolean' } },
})

admin('get', '/api/v1/admin/reports', {
  tags: ['AdminReports'],
  summary: 'List report jobs',
  operationId: 'adminReportsList',
  permission: 'reports.view',
  parameters: [
    paramRef('Page'),
    paramRef('Limit'),
    { name: 'type', in: 'query', schema: { $ref: '#/components/schemas/ReportType' } },
    { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/ReportStatus' } },
  ],
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/reports', {
  tags: ['AdminReports'],
  summary: 'Generate report',
  operationId: 'adminReportsGenerate',
  permission: 'reports.manage',
  status: 201,
  requestBody: jsonBody(ref('ReportExportRequest')),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/reports/{id}', {
  tags: ['AdminReports'],
  summary: 'Get report job',
  operationId: 'adminReportsGet',
  permission: 'reports.view',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/broadcasts', {
  tags: ['AdminBroadcasts'],
  summary: 'List broadcasts',
  operationId: 'adminBroadcastsList',
  permission: 'broadcasts.manage',
  parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED'] } }],
  data: { type: 'object', properties: { items: { type: 'array', items: ref('Broadcast') } } },
})

admin('post', '/api/v1/admin/broadcasts', {
  tags: ['AdminBroadcasts'],
  summary: 'Create broadcast',
  operationId: 'adminBroadcastsCreate',
  permission: 'broadcasts.manage',
  status: 201,
  requestBody: jsonBody(ref('CreateBroadcastRequest')),
  data: ref('Broadcast'),
})

admin('get', '/api/v1/admin/broadcasts/{id}', {
  tags: ['AdminBroadcasts'],
  summary: 'Get broadcast',
  operationId: 'adminBroadcastsGet',
  permission: 'broadcasts.manage',
  parameters: idParam,
  notFound: true,
  data: ref('Broadcast'),
})

admin('patch', '/api/v1/admin/broadcasts/{id}', {
  tags: ['AdminBroadcasts'],
  summary: 'Update broadcast',
  operationId: 'adminBroadcastsUpdate',
  permission: 'broadcasts.manage',
  parameters: idParam,
  requestBody: jsonBody(ref('CreateBroadcastRequest'), false),
  data: ref('Broadcast'),
})

admin('post', '/api/v1/admin/broadcasts/{id}/cancel', {
  tags: ['AdminBroadcasts'],
  summary: 'Cancel broadcast',
  operationId: 'adminBroadcastsCancel',
  permission: 'broadcasts.manage',
  parameters: idParam,
  data: ref('Broadcast'),
})

admin('post', '/api/v1/admin/broadcasts/{id}/send', {
  tags: ['AdminBroadcasts'],
  summary: 'Send broadcast',
  operationId: 'adminBroadcastsSend',
  permission: 'broadcasts.manage',
  parameters: idParam,
  data: ref('Broadcast'),
})

admin('get', '/api/v1/admin/announcements', {
  tags: ['AdminAnnouncements'],
  summary: 'List announcements (admin alias)',
  operationId: 'adminAnnouncementsList',
  permission: 'cms.view',
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

admin('post', '/api/v1/admin/announcements', {
  tags: ['AdminAnnouncements'],
  summary: 'Create announcement',
  operationId: 'adminAnnouncementsCreate',
  permission: 'cms.manage',
  status: 201,
  requestBody: cmsContentBody,
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/announcements/{id}', {
  tags: ['AdminAnnouncements'],
  summary: 'Update announcement',
  operationId: 'adminAnnouncementsUpdate',
  permission: 'cms.manage',
  parameters: idParam,
  requestBody: cmsContentBody,
  data: { type: 'object', additionalProperties: true },
})

admin('delete', '/api/v1/admin/announcements/{id}', {
  tags: ['AdminAnnouncements'],
  summary: 'Delete announcement',
  operationId: 'adminAnnouncementsDelete',
  permission: 'cms.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/announcements/{id}/restore', {
  tags: ['AdminAnnouncements'],
  summary: 'Restore announcement',
  operationId: 'adminAnnouncementsRestore',
  permission: 'cms.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/email-templates', {
  tags: ['AdminEmails'],
  summary: 'List email templates',
  operationId: 'adminEmailTemplatesList',
  permission: 'emails.manage',
  parameters: [paramRef('Page'), paramRef('Limit'), paramRef('Q'), { name: 'category', in: 'query', schema: { type: 'string' } }],
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/email-templates', {
  tags: ['AdminEmails'],
  summary: 'Create email template',
  operationId: 'adminEmailTemplatesCreate',
  permission: 'emails.manage',
  status: 201,
  requestBody: jsonBody({
    type: 'object',
    required: ['key', 'name', 'subject', 'bodyHtml'],
    properties: {
      key: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
      name: { type: 'string' },
      category: { type: 'string' },
      subject: { type: 'string' },
      bodyHtml: { type: 'string' },
      bodyText: { type: 'string' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/email-templates/{id}', {
  tags: ['AdminEmails'],
  summary: 'Get email template',
  operationId: 'adminEmailTemplatesGet',
  permission: 'emails.manage',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

admin('patch', '/api/v1/admin/email-templates/{id}', {
  tags: ['AdminEmails'],
  summary: 'Update email template',
  operationId: 'adminEmailTemplatesUpdate',
  permission: 'emails.manage',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    properties: {
      name: { type: 'string' },
      category: { type: 'string' },
      subject: { type: 'string' },
      bodyHtml: { type: 'string' },
      bodyText: { type: 'string' },
      isActive: { type: 'boolean' },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/email-templates/{id}/versions', {
  tags: ['AdminEmails'],
  summary: 'Email template versions',
  operationId: 'adminEmailTemplatesVersions',
  permission: 'emails.manage',
  parameters: idParam,
  data: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
})

admin('post', '/api/v1/admin/email-templates/{id}/preview', {
  tags: ['AdminEmails'],
  summary: 'Preview email template',
  operationId: 'adminEmailTemplatesPreview',
  permission: 'emails.manage',
  parameters: idParam,
  requestBody: jsonBody({
    type: 'object',
    required: ['variables'],
    properties: { variables: { type: 'object', additionalProperties: { type: 'string' } } },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/emails', {
  tags: ['AdminEmails'],
  summary: 'List email outbox',
  operationId: 'adminEmailsList',
  permission: 'emails.manage',
  parameters: [
    paramRef('Page'),
    paramRef('Limit'),
    { name: 'status', in: 'query', schema: { type: 'string', enum: ['QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'] } },
  ],
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/emails/test', {
  tags: ['AdminEmails'],
  summary: 'Enqueue test email',
  operationId: 'adminEmailsTest',
  permission: 'emails.manage',
  status: 201,
  requestBody: jsonBody({
    type: 'object',
    required: ['to'],
    properties: {
      to: { type: 'string', format: 'email' },
      templateKey: { type: 'string' },
      subject: { type: 'string' },
      html: { type: 'string' },
      variables: { type: 'object', additionalProperties: { type: 'string' } },
    },
  }),
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/emails/process-queue', {
  tags: ['AdminEmails'],
  summary: 'Process email outbox queue',
  operationId: 'adminEmailsProcessQueue',
  permission: 'emails.manage',
  data: { type: 'object', additionalProperties: true },
})

admin('get', '/api/v1/admin/emails/{id}', {
  tags: ['AdminEmails'],
  summary: 'Get outbox item',
  operationId: 'adminEmailsGet',
  permission: 'emails.manage',
  parameters: idParam,
  notFound: true,
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/emails/{id}/retry', {
  tags: ['AdminEmails'],
  summary: 'Retry failed email',
  operationId: 'adminEmailsRetry',
  permission: 'emails.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

admin('post', '/api/v1/admin/emails/{id}/cancel', {
  tags: ['AdminEmails'],
  summary: 'Cancel queued email',
  operationId: 'adminEmailsCancel',
  permission: 'emails.manage',
  parameters: idParam,
  data: { type: 'object', additionalProperties: true },
})

// ── Components ───────────────────────────────────────────────────────────────

function enumSchema(values, description) {
  return { type: 'string', enum: values, ...(description ? { description } : {}) }
}

function failureExample(status, code, message, details) {
  return {
    description: message,
    content: {
      'application/json': {
        schema: ref('ApiFailure'),
        example: {
          success: false,
          error: { code, message, ...(details ? { details } : {}) },
          meta: { requestId: '00000000-0000-4000-8000-000000000099', timestamp: '2026-08-05T10:00:00.000Z' },
        },
      },
    },
  }
}

const components = {
  securitySchemes: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'mfx_at',
      description:
        'Primary auth: HTTP-only JWT access cookie (`mfx_at`) set by POST /api/v1/auth/login and /refresh. Path `/`, SameSite=lax.',
    },
    refreshCookie: {
      type: 'apiKey',
      in: 'cookie',
      name: 'mfx_rt',
      description:
        'Refresh JWT cookie. Path restricted to `/api/v1/auth`, SameSite=strict. Used only by POST /api/v1/auth/refresh.',
    },
    csrfCookie: {
      type: 'apiKey',
      in: 'cookie',
      name: 'mfx_csrf',
      description:
        'Readable CSRF cookie set with login/refresh. Header `X-CSRF-Token` is accepted; server-side CSRF enforcement is planned.',
    },
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Documented for API clients and future gateway use. The current Express API authenticates via `mfx_at` cookie (Authorization header is allowed by CORS but not parsed yet).',
    },
  },
  parameters: {
    Page: {
      name: 'page',
      in: 'query',
      description: '1-based page index for offset pagination',
      schema: { type: 'integer', minimum: 1, default: 1 },
      example: 1,
    },
    Limit: {
      name: 'limit',
      in: 'query',
      description: 'Page size (max 100)',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      example: 20,
    },
    Q: { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text / filter search', example: 'growzy' },
    From: { name: 'from', in: 'query', schema: isoDateTime, description: 'Inclusive start (ISO-8601)' },
    To: { name: 'to', in: 'query', schema: isoDateTime, description: 'Inclusive end (ISO-8601)' },
    Status: { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Status filter' },
    Cursor: {
      name: 'cursor',
      in: 'query',
      description: 'Opaque cursor for keyset pagination (`nextCursor` from prior response)',
      schema: { type: 'string' },
    },
    UuidPath: { name: 'id', in: 'path', required: true, schema: uuid },
  },
  responses: {
    BadRequest: failureExample(400, 'VALIDATION_ERROR', 'Validation failed.', {
      issues: [{ path: 'email', message: 'Invalid email' }],
    }),
    Unauthorized: failureExample(401, 'UNAUTHENTICATED', 'Authentication required.'),
    Forbidden: failureExample(403, 'FORBIDDEN', 'You do not have permission to perform this action.'),
    NotFound: failureExample(404, 'NOT_FOUND', 'Resource not found.'),
    Conflict: failureExample(409, 'CONFLICT', 'Resource conflict.'),
    UnprocessableEntity: failureExample(422, 'VALIDATION_ERROR', 'Unprocessable entity.'),
    TooManyRequests: failureExample(429, 'RATE_LIMITED', 'Too many requests. Try again later.'),
    InternalError: failureExample(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'),
    ValidationError: failureExample(400, 'VALIDATION_ERROR', 'Validation failed.'),
  },
  schemas: {
    ResponseMeta: {
      type: 'object',
      required: ['requestId', 'timestamp'],
      properties: {
        requestId: { type: 'string', format: 'uuid' },
        timestamp: isoDateTime,
      },
    },
    ApiErrorBody: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {},
      },
    },
    ApiFailure: {
      type: 'object',
      required: ['success', 'error', 'meta'],
      properties: {
        success: { type: 'boolean', enum: [false] },
        error: ref('ApiErrorBody'),
        meta: ref('ResponseMeta'),
      },
    },
    Role: enumSchema(['USER', 'ADMIN', 'SUPER_ADMIN']),
    StaffRole: enumSchema(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'KYC', 'CONTENT', 'VIEWER']),
    UserStatus: enumSchema([
      'PENDING_VERIFICATION',
      'ACTIVE',
      'SUSPENDED',
      'BLOCKED',
      'CLOSED',
      'ARCHIVED',
    ]),
    KycStatus: enumSchema([
      'NOT_STARTED',
      'PENDING',
      'SUBMITTED',
      'UNDER_REVIEW',
      'NEED_MORE_INFO',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'SUSPENDED',
    ]),
    KycDocumentType: enumSchema([
      'PASSPORT',
      'NATIONAL_ID',
      'DRIVING_LICENSE',
      'RESIDENCE_PERMIT',
      'PROOF_OF_ADDRESS',
      'SELFIE',
      'BANK_STATEMENT',
      'UTILITY_BILL',
    ]),
    KycDocumentSide: enumSchema(['FRONT', 'BACK', 'SINGLE']),
    TradeDirection: enumSchema(['BUY', 'SELL']),
    TradeOutcome: enumSchema(['WIN', 'LOSS', 'BREAKEVEN']),
    TradeStatus: enumSchema(['DRAFT', 'SCHEDULED', 'OPEN', 'RUNNING', 'CLOSED', 'CANCELLED', 'ARCHIVED']),
    ReportType: enumSchema([
      'DAILY',
      'WEEKLY',
      'MONTHLY',
      'YEARLY',
      'INVESTOR',
      'PORTFOLIO',
      'PERFORMANCE',
      'FINANCE',
      'KYC',
      'AUDIT',
      'CUSTOM',
    ]),
    ReportFormat: enumSchema(['CSV', 'JSON', 'XLSX', 'PDF']),
    ReportStatus: enumSchema(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    SupportStatus: enumSchema(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']),
    SupportPriority: enumSchema(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
    SupportCategory: enumSchema([
      'GENERAL',
      'BILLING',
      'KYC',
      'DEPOSIT',
      'WITHDRAWAL',
      'TECHNICAL',
      'ACCOUNT',
      'OTHER',
    ]),
    BroadcastChannel: enumSchema(['EMAIL', 'IN_APP', 'POPUP', 'BANNER', 'ANNOUNCEMENT']),
    BroadcastAudience: enumSchema(['ALL', 'SEGMENT', 'COUNTRY', 'VIP', 'SELECTED', 'SINGLE']),
    MediaKind: enumSchema(['IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER']),
    CmsStatus: enumSchema(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']),
    PublicUser: {
      type: 'object',
      properties: {
        id: uuid,
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string', nullable: true },
        country: { type: 'string', nullable: true },
        timezone: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        role: ref('Role'),
        status: ref('UserStatus'),
        kycStatus: ref('KycStatus'),
        emailVerified: { type: 'boolean' },
        createdAt: isoDateTime,
      },
    },
    SessionInfo: {
      type: 'object',
      properties: {
        id: uuid,
        device: { type: 'string' },
        browser: { type: 'string' },
        ip: { type: 'string' },
        location: { type: 'string' },
        lastUsedAt: isoDateTime,
        isCurrent: { type: 'boolean' },
      },
    },
    RegisterRequest: {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 10, maxLength: 128 },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        country: { type: 'string', minLength: 2, maxLength: 2 },
        referralCode: { type: 'string' },
        acceptTerms: { type: 'boolean' },
        acceptRisk: { type: 'boolean' },
      },
    },
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        otp: { type: 'string' },
      },
    },
    ProfileUpdateRequest: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        country: { type: 'string' },
        timezone: { type: 'string' },
        language: { type: 'string' },
        addressLine1: { type: 'string' },
        addressLine2: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        postalCode: { type: 'string' },
        bio: { type: 'string' },
      },
    },
    KycUpdateRequest: {
      type: 'object',
      properties: {
        country: { type: 'string', minLength: 2, maxLength: 2 },
        dateOfBirth: isoDate,
        nationality: { type: 'string' },
        addressLine1: { type: 'string' },
        city: { type: 'string' },
        postalCode: { type: 'string' },
        occupation: { type: 'string' },
        primaryDocumentType: ref('KycDocumentType'),
      },
    },
    KycReviewRequest: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        internalNotes: { type: 'string' },
        riskLevel: { type: 'string' },
        riskScore: { type: 'integer' },
        fraudFlag: { type: 'boolean' },
        documentQuality: { type: 'string' },
        assignedReviewerId: uuid,
      },
    },
    Wallet: { type: 'object', additionalProperties: true },
    WalletSummary: { type: 'object', additionalProperties: true },
    Deposit: { type: 'object', additionalProperties: true },
    Withdrawal: { type: 'object', additionalProperties: true },
    Trade: { type: 'object', additionalProperties: true },
    PerformanceSummary: { type: 'object', additionalProperties: true },
    EquityPoint: {
      type: 'object',
      properties: {
        date: isoDate,
        balance: { type: 'string' },
        profit: { type: 'string' },
        cumulativeProfit: { type: 'string' },
      },
    },
    ProfitDistribution: { type: 'object', additionalProperties: true },
    Notification: {
      type: 'object',
      properties: {
        id: uuid,
        type: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        actionUrl: { type: 'string', nullable: true },
        readAt: { ...isoDateTime, nullable: true },
        createdAt: isoDateTime,
      },
    },
    SupportTicket: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        subject: { type: 'string' },
        status: ref('SupportStatus'),
        userLabel: { type: 'string' },
        userId: { type: 'string' },
        priority: ref('SupportPriority'),
        createdAt: isoDateTime,
        updatedAt: isoDateTime,
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              author: { type: 'string' },
              body: { type: 'string' },
              at: isoDateTime,
            },
          },
        },
      },
    },
    PublicSettings: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        supportEmail: { type: 'string' },
        defaultCurrency: { type: 'string' },
        maintenanceMode: { type: 'boolean' },
        featureFlags: { type: 'object', additionalProperties: { type: 'boolean' } },
        limits: {
          type: 'object',
          properties: {
            minDeposit: { type: 'string' },
            maxDeposit: { type: 'string' },
            minWithdrawal: { type: 'string' },
            maxWithdrawal: { type: 'string' },
          },
        },
      },
    },
    PlatformSettings: {
      allOf: [
        ref('PublicSettings'),
        {
          type: 'object',
          properties: {
            timezone: { type: 'string' },
            supportPhone: { type: 'string' },
            networks: { type: 'array', items: { type: 'string' } },
            coins: { type: 'array', items: { type: 'string' } },
          },
        },
      ],
    },
    PlatformSettingsUpdate: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        supportEmail: { type: 'string' },
        supportPhone: { type: 'string' },
        defaultCurrency: { type: 'string' },
        timezone: { type: 'string' },
        maintenanceMode: { type: 'boolean' },
        networks: { type: 'array', items: { type: 'string' } },
        coins: { type: 'array', items: { type: 'string' } },
        minDeposit: { type: 'string' },
        maxDeposit: { type: 'string' },
        minWithdrawal: { type: 'string' },
        maxWithdrawal: { type: 'string' },
      },
    },
    ReportExportRequest: {
      type: 'object',
      required: ['type', 'format'],
      properties: {
        type: ref('ReportType'),
        from: isoDate,
        to: isoDate,
        format: ref('ReportFormat'),
        filters: { type: 'object', additionalProperties: { type: 'string' } },
        scope: { type: 'string' },
      },
    },
    CmsPublicBootstrap: {
      type: 'object',
      properties: {
        landing: { type: 'object', additionalProperties: true },
        platform: ref('PlatformCmsDocument'),
        faqs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              answer: { type: 'string' },
            },
          },
        },
        testimonials: { type: 'array', items: {} },
        siteSeo: { type: 'object', additionalProperties: true },
        featureFlags: { type: 'object', additionalProperties: { type: 'boolean' } },
      },
    },
    PlatformCmsDocument: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
        updatedAt: isoDateTime,
        publishedAt: { ...isoDateTime, nullable: true },
        marketingNav: { type: 'array', items: { type: 'object', additionalProperties: true } },
        dashboard: { type: 'object', additionalProperties: true },
        wallet: { type: 'object', additionalProperties: true },
        trades: { type: 'object', additionalProperties: true },
        performance: { type: 'object', additionalProperties: true },
        supportBlock: { type: 'object', additionalProperties: true },
        riskDisclaimer: { type: 'string' },
        contactBlurb: { type: 'string' },
      },
    },
    CreateTradeRequest: {
      type: 'object',
      required: ['pair', 'direction', 'entryPrice', 'tradeDate'],
      properties: {
        pair: { type: 'string' },
        direction: ref('TradeDirection'),
        entryPrice: { type: 'string' },
        exitPrice: { type: 'string' },
        stopLoss: { type: 'string' },
        takeProfit: { type: 'string' },
        lotSize: { type: 'string' },
        leverage: { type: 'string' },
        strategy: { type: 'string' },
        risk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        tradeDate: isoDate,
        openTime: isoDateTime,
        adminNotes: { type: 'string' },
        returnPct: { type: 'string' },
      },
    },
    DepositReviewRequest: {
      type: 'object',
      properties: {
        decision: {
          type: 'string',
          enum: ['APPROVE', 'REJECT', 'REQUEST_INFORMATION', 'FORCE_COMPLETE', 'FORCE_CANCEL'],
        },
        reason: { type: 'string' },
        creditedAmount: { type: 'string' },
        internalNotes: { type: 'string' },
      },
    },
    WithdrawalReviewRequest: {
      type: 'object',
      properties: {
        decision: {
          type: 'string',
          enum: ['APPROVE', 'REJECT', 'PAID', 'REQUEST_INFORMATION', 'FORCE_COMPLETE', 'FORCE_CANCEL'],
        },
        reason: { type: 'string' },
        transactionRef: { type: 'string' },
        internalNotes: { type: 'string' },
      },
    },
    CreateBroadcastRequest: {
      type: 'object',
      required: ['title', 'body', 'channels', 'audience'],
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        channels: { type: 'array', items: ref('BroadcastChannel'), minItems: 1 },
        audience: ref('BroadcastAudience'),
        audienceFilter: { type: 'object', additionalProperties: true },
        scheduledAt: isoDateTime,
      },
    },
    Broadcast: { type: 'object', additionalProperties: true },
  },
}

const tags = [
  { name: 'Health', description: 'Service health and version' },
  { name: 'Auth', description: 'Registration, login, sessions, password flows' },
  { name: 'Users', description: 'Current user' },
  { name: 'Profile', description: 'Extended profile and session management' },
  { name: 'KYC', description: 'Know Your Customer submissions and documents' },
  { name: 'Wallet', description: 'Investor wallet balances and history' },
  { name: 'Deposits', description: 'Deposit requests and proofs' },
  { name: 'Withdrawals', description: 'Withdrawal requests' },
  { name: 'Transactions', description: 'Transaction history' },
  { name: 'Trades', description: 'Trade tape and stats' },
  { name: 'Performance', description: 'ROI, equity series, distributions' },
  { name: 'Portfolio', description: 'Investor portfolio snapshot' },
  { name: 'Returns', description: 'Daily returns for investors' },
  { name: 'Notifications', description: 'In-app notifications' },
  { name: 'Support', description: 'Investor support tickets' },
  { name: 'Settings', description: 'Public and personal settings' },
  { name: 'Reports', description: 'Investor report exports' },
  { name: 'CMS', description: 'Content management (public + staff)' },
  { name: 'Files', description: 'Signed file downloads' },
  { name: 'EmailTracking', description: 'Open/click tracking pixels' },
  { name: 'Admin', description: 'Admin dashboard, audit, ops metrics' },
  { name: 'AdminUsers', description: 'User administration' },
  { name: 'AdminKYC', description: 'KYC review queue' },
  { name: 'AdminFinance', description: 'Deposits, withdrawals, ledger, payment methods' },
  { name: 'AdminTrading', description: 'Trade desk and daily returns' },
  { name: 'AdminMedia', description: 'Media manager' },
  { name: 'AdminSupport', description: 'Support desk administration' },
  { name: 'AdminSettings', description: 'Platform settings and feature flags' },
  { name: 'AdminReports', description: 'Report generation jobs' },
  { name: 'AdminBroadcasts', description: 'Multi-channel broadcasts' },
  { name: 'AdminAnnouncements', description: 'Announcement CRUD (admin alias)' },
  { name: 'AdminEmails', description: 'Email templates and outbox' },
]

const doc = {
  openapi: '3.1.0',
  info: {
    title: 'Growzy API',
    version: '1.0.0',
    summary: 'Growzy / Meridian FX investment platform API (Phases 1-6)',
    description: [
      '# Growzy API',
      '',
      'Complete OpenAPI **3.1** specification for every Express endpoint.',
      '',
      '## Modules',
      'Authentication · Users · Profile · Sessions · Admin · Dashboard · RBAC · Permissions · KYC · Wallet · Ledger · Deposits · Withdrawals · Transactions · Trading · Performance · Portfolio · Daily Returns · CMS · Media · Reports · Email · Notifications · Support · Broadcasts · Settings · Feature Flags · Health · Version',
      '',
      '## Authentication',
      '- **Cookie JWT (primary):** `mfx_at` access token (httpOnly). Set by login/refresh.',
      '- **Refresh cookie:** `mfx_rt` (path `/api/v1/auth` only).',
      '- **CSRF cookie:** `mfx_csrf` (readable). Header `X-CSRF-Token` accepted.',
      '- **Bearer JWT:** Documented for clients/gateways; runtime currently validates the access cookie.',
      '- **Investor:** any authenticated `USER` (or staff acting as user) with investor permissions.',
      '- **Admin:** `authenticate` + `requireAdminAccess` + fine-grained `requirePermission(...)`.',
      '',
      '## Permissions',
      'See `x-permission` on each secured operation. Catalog includes `dashboard.view`, `users.*`, `kyc.*`, `wallet.view`, `deposits.*`, `withdrawals.*`, `finance.*`, `trades.*`, `performance.view`, `returns.manage`, `cms.*`, `media.manage`, `emails.manage`, `support.*`, `reports.*`, `broadcasts.manage`, `settings.manage`, `notifications.view`, `profile.*`, `sessions.manage`, `audit.view`, `activity.view`, `roles.view`.',
      '',
      '## Response envelope',
      '```json',
      '{ "success": true, "data": {}, "meta": { "requestId": "uuid", "timestamp": "ISO-8601" } }',
      '```',
      'Errors use the same `meta` with `success: false` and `error: { code, message, details? }`.',
      '',
      '## Money & pagination',
      '- Money is always a **decimal string** (never a JSON number).',
      '- Offset lists: `page`, `limit`, often with `total`/`hasNext` in payload.',
      '- Cursor lists: `cursor` / `nextCursor`.',
      '',
      '## Interactive docs',
      '- Swagger UI: `/api/docs`',
      '- OpenAPI JSON: `/api/openapi.json` (also `/api/docs/json`)',
      '- OpenAPI YAML: `/api/docs/yaml`',
      '- Redoc: `/api/redoc`',
      '',
      'Regenerate: `node scripts/generate-openapi.mjs`',
    ].join('\n'),
    contact: { name: 'Growzy Engineering' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local development' },
    { url: '/', description: 'Relative to deployment host' },
  ],
  tags,
  paths,
  components,
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  'x-tagGroups': [
    { name: 'Platform', tags: ['Health', 'Settings', 'Files', 'EmailTracking'] },
    { name: 'Authentication', tags: ['Auth', 'Users', 'Profile'] },
    { name: 'Investor', tags: ['KYC', 'Wallet', 'Deposits', 'Withdrawals', 'Transactions', 'Trades', 'Performance', 'Portfolio', 'Returns', 'Notifications', 'Support', 'Reports'] },
    { name: 'Content', tags: ['CMS'] },
    {
      name: 'Admin',
      tags: [
        'Admin',
        'AdminUsers',
        'AdminKYC',
        'AdminFinance',
        'AdminTrading',
        'AdminMedia',
        'AdminSupport',
        'AdminSettings',
        'AdminReports',
        'AdminBroadcasts',
        'AdminAnnouncements',
        'AdminEmails',
      ],
    },
  ],
}

// Enrich schemas with ErrorCode enum
components.schemas.ErrorCode = enumSchema(
  [
    'VALIDATION_ERROR',
    'UNAUTHENTICATED',
    'TOKEN_EXPIRED',
    'FORBIDDEN',
    'EMAIL_NOT_VERIFIED',
    'ACCOUNT_SUSPENDED',
    'NOT_FOUND',
    'CONFLICT',
    'INSUFFICIENT_BALANCE',
    'BELOW_MINIMUM',
    'ABOVE_MAXIMUM',
    'WITHDRAWAL_COOLDOWN',
    'RETURN_ALREADY_APPLIED',
    'RUN_IN_PROGRESS',
    'RATE_LIMITED',
    'MAINTENANCE_MODE',
    'INTERNAL_ERROR',
    'NETWORK_ERROR',
  ],
  'Canonical API error codes',
)
components.schemas.ApiErrorBody.properties.code = ref('ErrorCode')
components.schemas.Permission = enumSchema(
  [
    'dashboard.view',
    'users.view',
    'users.edit',
    'users.suspend',
    'users.delete',
    'users.restore',
    'audit.view',
    'activity.view',
    'roles.view',
    'profile.view',
    'profile.edit',
    'sessions.manage',
    'kyc.view',
    'kyc.submit',
    'kyc.review',
    'wallet.view',
    'deposits.view',
    'deposits.create',
    'withdrawals.view',
    'withdrawals.create',
    'finance.view',
    'finance.review',
    'finance.manage',
    'finance.adjust',
    'trades.view',
    'trades.manage',
    'performance.view',
    'returns.manage',
    'cms.view',
    'cms.manage',
    'media.manage',
    'emails.manage',
    'support.view',
    'support.manage',
    'reports.view',
    'reports.manage',
    'broadcasts.manage',
    'settings.manage',
    'notifications.view',
  ],
  'RBAC permission strings',
)
components.schemas.CursorPage = {
  type: 'object',
  description: 'Cursor pagination wrapper used by several list endpoints',
  properties: {
    items: { type: 'array', items: { type: 'object', additionalProperties: true } },
    nextCursor: { type: 'string', nullable: true },
  },
  example: {
    items: [{ id: '00000000-0000-4000-8000-000000000010' }],
    nextCursor: 'eyJpZCI6Ii4uLiJ9',
  },
}
components.schemas.OffsetPage = {
  type: 'object',
  description: 'Offset pagination metadata (when returned inside data)',
  properties: {
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 42 },
    totalPages: { type: 'integer', example: 3 },
    hasNext: { type: 'boolean', example: true },
  },
}

// Add request examples on key auth bodies
if (paths['/api/v1/auth/login']?.post?.requestBody) {
  paths['/api/v1/auth/login'].post.requestBody.content['application/json'].example = {
    email: 'investor@example.com',
    password: 'SecurePass1!',
  }
}
if (paths['/api/v1/auth/register']?.post?.requestBody) {
  paths['/api/v1/auth/register'].post.requestBody.content['application/json'].example = {
    email: 'investor@example.com',
    password: 'SecurePass1!',
    firstName: 'Ada',
    lastName: 'Lovelace',
    country: 'AE',
    acceptTerms: true,
    acceptRisk: true,
  }
}
if (paths['/api/v1/admin/media/upload']?.post?.requestBody) {
  paths['/api/v1/admin/media/upload'].post.requestBody.content['multipart/form-data'].encoding = {
    file: { contentType: 'image/png, image/jpeg, image/svg+xml, application/pdf, video/*' },
  }
}

// ── YAML serializer (no deps) ────────────────────────────────────────────────

function toYaml(value, indent = 0) {
  const pad = '  '.repeat(indent)
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (value === '' || /[:#{}[\],&*?|<>=!%@`'"\\\n\r\t]/.test(value) || value.trim() !== value) {
      return JSON.stringify(value)
    }
    return value
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const nested = toYaml(item, indent + 1)
          return `${pad}- ${nested.replace(/^\s+/, '')}`
        }
        return `${pad}- ${toYaml(item, 0)}`
      })
      .join('\n')
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    return keys
      .map((key) => {
        const v = value[key]
        const safeKey = /[:#{}[\],&*?|<>=!%@`'"\\\s]/.test(key) ? JSON.stringify(key) : key
        if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0) {
          return `${pad}${safeKey}:\n${toYaml(v, indent + 1)}`
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${pad}${safeKey}:\n${toYaml(v, indent + 1)}`
        }
        return `${pad}${safeKey}: ${toYaml(v, 0)}`
      })
      .join('\n')
  }
  return JSON.stringify(value)
}

// ── Postman Collection v2.1 ──────────────────────────────────────────────────

function buildPostman(openApiDoc) {
  const base = '{{baseUrl}}'
  const itemsByTag = new Map()
  for (const [pathKey, pathItem] of Object.entries(openApiDoc.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!operation || typeof operation !== 'object' || !operation.operationId) continue
      const tag = operation.tags?.[0] || 'Other'
      if (!itemsByTag.has(tag)) itemsByTag.set(tag, [])
      const pathParts = pathKey.split('/').filter(Boolean)
      const url = {
        raw: `${base}${pathKey.replace(/\{([^}]+)\}/g, ':$1')}`,
        host: ['{{baseUrl}}'],
        path: pathParts.map((p) => p.replace(/^\{([^}]+)\}$/, ':$1')),
      }
      const headers = [{ key: 'Content-Type', value: 'application/json' }]
      const request = {
        method: method.toUpperCase(),
        header: headers,
        url,
        description: [operation.summary, operation.description, operation['x-permission'] ? `Permission: ${operation['x-permission']}` : '']
          .filter(Boolean)
          .join('\n\n'),
      }
      const jsonContent = operation.requestBody?.content?.['application/json']
      if (jsonContent?.example) {
        request.body = { mode: 'raw', raw: JSON.stringify(jsonContent.example, null, 2) }
      } else if (jsonContent?.schema) {
        request.body = { mode: 'raw', raw: '{\n  \n}' }
      }
      if (operation.requestBody?.content?.['multipart/form-data']) {
        request.body = {
          mode: 'formdata',
          formdata: Object.keys(operation.requestBody.content['multipart/form-data'].schema?.properties || {}).map(
            (key) => ({
              key,
              type: key === 'file' || key === 'avatar' ? 'file' : 'text',
              src: key === 'file' || key === 'avatar' ? [] : '',
            }),
          ),
        }
        request.header = request.header.filter((h) => h.key !== 'Content-Type')
      }
      itemsByTag.get(tag).push({
        name: operation.summary || operation.operationId,
        request,
        response: [],
      })
    }
  }
  return {
    info: {
      name: 'Growzy API',
      description: openApiDoc.info.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: 'growzy-api-v1',
    },
    auth: {
      type: 'apikey',
      apikey: [{ key: 'key', value: 'mfx_at', type: 'string' }, { key: 'value', value: '{{accessToken}}', type: 'string' }, { key: 'in', value: 'cookie', type: 'string' }],
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:4000' },
      { key: 'accessToken', value: '' },
      { key: 'refreshToken', value: '' },
    ],
    item: [...itemsByTag.entries()].map(([name, item]) => ({ name, item })),
  }
}

function buildPostmanEnvironment() {
  return {
    id: 'growzy-local',
    name: 'Growzy Local',
    values: [
      { key: 'baseUrl', value: 'http://localhost:4000', enabled: true, type: 'default' },
      { key: 'accessToken', value: '', enabled: true, type: 'secret' },
      { key: 'refreshToken', value: '', enabled: true, type: 'secret' },
      { key: 'investorEmail', value: 'investor@example.com', enabled: true, type: 'default' },
      { key: 'investorPassword', value: 'SecurePass1!', enabled: true, type: 'secret' },
      { key: 'adminEmail', value: 'admin@example.com', enabled: true, type: 'default' },
      { key: 'adminPassword', value: 'SecurePass1!', enabled: true, type: 'secret' },
    ],
    _postman_variable_scope: 'environment',
  }
}

function buildInsomnia(openApiDoc) {
  const resources = []
  const workspaceId = 'wrk_growzy'
  const envId = 'env_growzy_base'
  resources.push({
    _id: workspaceId,
    _type: 'workspace',
    name: 'Growzy API',
    description: 'Generated from OpenAPI 3.1',
  })
  resources.push({
    _id: envId,
    _type: 'environment',
    parentId: workspaceId,
    name: 'Base Environment',
    data: {
      base_url: 'http://localhost:4000',
      access_token: '',
    },
  })
  const folderIds = new Map()
  let i = 0
  for (const [pathKey, pathItem] of Object.entries(openApiDoc.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!operation?.operationId) continue
      const tag = operation.tags?.[0] || 'Other'
      if (!folderIds.has(tag)) {
        const fid = `fld_${tag.replace(/[^a-zA-Z0-9]/g, '_')}`
        folderIds.set(tag, fid)
        resources.push({ _id: fid, _type: 'request_group', parentId: workspaceId, name: tag })
      }
      i += 1
      const url = `{{ _.base_url }}${pathKey.replace(/\{([^}]+)\}/g, ':$1')}`
      const req = {
        _id: `req_${operation.operationId}`,
        _type: 'request',
        parentId: folderIds.get(tag),
        name: operation.summary || operation.operationId,
        method: method.toUpperCase(),
        url,
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        body: {},
        parameters: [],
        authentication: {},
        metaSortKey: i,
      }
      const example = operation.requestBody?.content?.['application/json']?.example
      if (example) {
        req.body = { mimeType: 'application/json', text: JSON.stringify(example, null, 2) }
      }
      resources.push(req)
    }
  }
  return {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'growzy.generate-openapi',
    resources,
  }
}

mkdirSync(outDir, { recursive: true })
const apiOpenApiDir = join(root, 'apps', 'api', 'openapi')
mkdirSync(apiOpenApiDir, { recursive: true })
const collectionsDir = join(root, 'docs', 'openapi', 'collections')
mkdirSync(collectionsDir, { recursive: true })

const jsonPath = join(outDir, 'openapi.json')
const yamlPath = join(outDir, 'openapi.yaml')
const jsonBodyOut = JSON.stringify(doc, null, 2)
const yamlBodyOut = `${toYaml(doc)}\n`
writeFileSync(jsonPath, jsonBodyOut)
writeFileSync(yamlPath, yamlBodyOut)
writeFileSync(join(apiOpenApiDir, 'openapi.json'), jsonBodyOut)
writeFileSync(join(apiOpenApiDir, 'openapi.yaml'), yamlBodyOut)

const postman = buildPostman(doc)
const postmanEnv = buildPostmanEnvironment()
const insomnia = buildInsomnia(doc)
writeFileSync(join(collectionsDir, 'growzy.postman_collection.json'), JSON.stringify(postman, null, 2))
writeFileSync(join(collectionsDir, 'growzy.postman_environment.json'), JSON.stringify(postmanEnv, null, 2))
writeFileSync(join(collectionsDir, 'growzy.insomnia.json'), JSON.stringify(insomnia, null, 2))

const pathCount = Object.keys(paths).length
const opCount = Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0)
console.log(`Wrote ${jsonPath}`)
console.log(`Wrote ${yamlPath}`)
console.log(`Copied to ${apiOpenApiDir}`)
console.log(`Postman + Insomnia → ${collectionsDir}`)
console.log(`Paths: ${pathCount}`)
console.log(`Operations: ${opCount}`)
console.log(`OpenAPI: ${doc.openapi}`)
