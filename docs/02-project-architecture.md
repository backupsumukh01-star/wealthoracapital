# 02 — Project Architecture

Where [01 — Folder Structure](./01-folder-structure.md) says *what goes where*, this document says
*why*, and lays down the rules that keep the codebase from rotting once four people are committing
to it.

---

## 1. System topology

```
                         ┌────────────────────────────┐
                         │        Browser             │
                         │  Next.js 15 (RSC + client) │
                         └────────────┬───────────────┘
                                      │ HTTPS, httpOnly cookies
                                      ▼
                         ┌────────────────────────────┐
                         │          Nginx             │
                         │  TLS · gzip/brotli · rate  │
                         │  limit · static · proxy    │
                         └───────┬────────────┬───────┘
                                 │            │
                    /  (web)     │            │  /api/*  (api)
                                 ▼            ▼
                  ┌──────────────────┐  ┌────────────────────────┐
                  │  PM2: web        │  │  PM2: api (cluster)    │
                  │  next start:3000 │  │  express :4000         │
                  └──────────────────┘  └───────┬────────────────┘
                                                │
                          ┌─────────────────────┼──────────────────────┐
                          ▼                     ▼                      ▼
                 ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
                 │  PostgreSQL 16 │   │  Local disk       │   │  SMTP provider   │
                 │  (primary)     │   │  /var/app/uploads │   │  (Nodemailer)    │
                 └────────────────┘   └──────────────────┘   └──────────────────┘
                          ▲
                          │  nightly pg_dump → encrypted → offsite
                          └──────────────────────────────────────────
```

**Why a separate Express API instead of Next.js route handlers?**
Three reasons, all practical: the daily-return engine needs long-running transactional work that
doesn't belong in a serverless-shaped runtime; cron jobs need a persistent process; and a
standalone API means a future mobile app or partner integration costs nothing extra. The trade-off
is one more process to deploy, which PM2 handles.

---

## 2. Backend layering

Strict, one-directional. A layer may only call the layer below it.

```
  HTTP
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│ ROUTE          path, middleware chain, controller binding    │
│                no logic, no try/catch, no Prisma             │
├──────────────────────────────────────────────────────────────┤
│ MIDDLEWARE     authenticate · authorize · validate · upload  │
│                · rate-limit · audit                          │
├──────────────────────────────────────────────────────────────┤
│ CONTROLLER     read req → call service → shape response      │
│                never contains business rules                 │
├──────────────────────────────────────────────────────────────┤
│ SERVICE        ALL business rules, transactions, events      │
│                may call other modules' services              │
├──────────────────────────────────────────────────────────────┤
│ REPOSITORY     Prisma queries only, returns entities         │
│                no business rules, no HTTP awareness          │
├──────────────────────────────────────────────────────────────┤
│ PRISMA / DB                                                  │
└──────────────────────────────────────────────────────────────┘
```

### What each layer may and may not do

| Layer | May | May not |
|-------|-----|---------|
| Route | Declare path + middleware | Contain any `if` about business state |
| Controller | Read `req.user`, `req.body`, call one service method, return envelope | Query Prisma, compute money, decide permissions |
| Service | Business rules, transactions, call other services, emit events | Touch `req`/`res`, know about HTTP status codes |
| Repository | Prisma calls, query composition, pagination | Throw HTTP errors, apply business rules |

A controller that is longer than ~15 lines is a smell — the logic belongs in the service.

### Error handling

Services throw typed errors; a single middleware translates them to HTTP.

```ts
// utils/api-error.ts — specification
class AppError extends Error {
  constructor(
    public code: ErrorCode,        // 'INSUFFICIENT_BALANCE'
    public httpStatus: number,     // 422
    message: string,               // safe for the client to see
    public details?: unknown,      // field errors, never internals
  ) { super(message) }
}

BadRequestError · UnauthorizedError · ForbiddenError · NotFoundError
ConflictError · ValidationError · RateLimitError · InsufficientFundsError
```

The error handler is the **only** place that formats an error response, logs the stack, and
decides what the client is allowed to know. In production, unknown errors become a generic
`INTERNAL_ERROR` with the correlation ID attached so support can find the log line.

---

## 3. Module boundaries

Each module in `src/modules/*` is a bounded capability that owns its tables and exposes a service.

| Module | Owns tables | Public service surface (what others may call) |
|--------|-------------|-----------------------------------------------|
| `auth` | `Session`, `VerificationToken`, `OAuthAccount` | `issueTokens`, `revokeSession`, `verifyAccess` |
| `users` | `User`, `UserProfile` | `findById`, `updateProfile`, `setStatus` |
| `wallet` | `Wallet`, `LedgerEntry` | `credit`, `debit`, `lock`, `unlock`, `getBalance` |
| `deposits` | `Deposit` | `create`, `approve`, `reject` |
| `withdrawals` | `Withdrawal` | `request`, `approve`, `reject`, `markPaid` |
| `trades` | `Trade`, `TradingDay` | `record`, `update`, `list` |
| `daily-return` | `DailyReturnRun`, `ProfitDistribution` | `preview`, `apply`, `reverse` |
| `performance` | *(reads only)* | `summary`, `series`, `monthly`, `yearly` |
| `notifications` | `Notification`, `NotificationPreference` | `notify(userId, event, payload)` |
| `settings` | `Setting` | `get`, `getAll`, `set` |
| `audit` | `AuditLog` | `record(actor, action, target, before, after)` |
| `exports` | *(none)* | `toCsv`, `toPdf` |

### The dependency rule

**Only `wallet` writes to `LedgerEntry`.** Deposits, withdrawals and the daily-return engine all
call `walletService`/`ledgerService` with an explicit transaction handle. This is the one rule
whose violation silently corrupts money, so it is enforced twice: by convention, and by an ESLint
`no-restricted-imports` rule banning `LedgerEntry` writes outside that file.

```
deposits ──┐
withdrawals├──► wallet.ledgerService ──► LedgerEntry (append-only)
daily-return┘                       └──► Wallet.balance (projection update)
admin ─────┘
```

### Cross-module communication

Two mechanisms, chosen deliberately:

1. **Direct service call** for anything that must succeed or fail with the caller
   (e.g. approving a deposit must credit the wallet in the same transaction).
2. **Domain event** for side effects that must not break the primary operation
   (e.g. sending an email after a deposit is approved).

```ts
// v1: a synchronous in-process emitter with an outbox table for durability
events.emit('deposit.approved', { depositId, userId, amount })

// listeners registered at boot
notifications.on('deposit.approved', → in-app + email)
audit.on('deposit.approved',        → AuditLog)
```

An email failure must never roll back a credited deposit. Therefore: **commit the transaction
first, then emit.** Events that must not be lost are written to an `OutboxEvent` row inside the
transaction and dispatched by a worker — used for the daily-return notification fan-out, where
losing 10,000 emails would be unacceptable.

---

## 4. Frontend architecture

### Rendering strategy per area

| Area | Strategy | Why |
|------|----------|-----|
| Marketing pages | Server Components, statically rendered, ISR for live stats | SEO and LCP are the whole point |
| Auth pages | Client Components | Form-heavy, no SEO value |
| Dashboard | Server Component shell + Client Components for data | Fast paint, then hydrate live figures |
| Admin | Client Components | Highly interactive, zero SEO value |

### Data flow

```
Component
   └─ useDeposits()                 ← feature hook (features/deposits/hooks.ts)
        └─ useQuery(...)            ← React Query: cache, retry, background refetch
             └─ depositsApi.list()  ← feature api (features/deposits/api.ts)
                  └─ apiClient      ← lib/api-client.ts
                       ├─ credentials: 'include'
                       ├─ auto-retry once on 401 via /auth/refresh
                       ├─ unwraps { success, data } envelope
                       └─ throws typed ApiError
```

**Rules:**
- Components never call `fetch` directly. Always through a feature hook.
- Query keys are centralised per feature (`depositKeys.list(filters)`) so invalidation is
  reliable and greppable.
- Mutations invalidate explicitly; wallet-affecting mutations invalidate
  `['wallet']`, `['performance']` and `['notifications']` together.
- Filters, sort and pagination live in the **URL**, not component state, so every table view is
  shareable and survives refresh.

### Component taxonomy

```
components/ui/*          Primitives. Style + a11y only. No app knowledge.
components/motion/*      Animation wrappers. Reduced-motion aware.
components/common/*      App-aware but domain-agnostic (Money, DataTable).
components/<domain>/*    Domain components (deposits, trades, admin).
features/<domain>/*      Hooks + API. No JSX except guards.
app/**/page.tsx          Composition only. Thin.
```

A `page.tsx` should read like a table of contents. If it contains layout maths or business logic,
that logic belongs in a component or hook.

### State ownership

| Kind of state | Lives in |
|---------------|----------|
| Server data (wallet, trades, users) | React Query cache — never duplicated into local state |
| Form state | React Hook Form |
| Filters, pagination, tabs | URL search params |
| Theme, sidebar collapsed | `localStorage` + context |
| Toasts, modals | Local component state or a small context |

There is deliberately **no Redux/Zustand** in v1. Everything fits the four buckets above; adding a
global store would mostly create a second, stale copy of server data.

---

## 5. The shared contract

`packages/shared` exists to make it impossible for the frontend and backend to disagree.

```ts
// packages/shared/src/schemas/deposit.schema.ts
export const createDepositSchema = z.object({
  amount: z.string().refine(isPositiveDecimal, 'Enter a valid amount')
           .refine(gte(MIN_DEPOSIT), `Minimum is $${MIN_DEPOSIT}`),
  methodId: z.string().uuid(),
  reference: z.string().min(3).max(120).optional(),
})
export type CreateDepositInput = z.infer<typeof createDepositSchema>
```

The **same object** is used by:
- the API's `validate(createDepositSchema)` middleware, and
- the web app's `useForm({ resolver: zodResolver(createDepositSchema) })`.

Consequence: a rule change (say, raising the minimum deposit) is one edit, and the client and
server can never drift. Error messages are written once, for humans.

---

## 6. Naming and file conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | `kebab-case` | `daily-return.service.ts` |
| React components | `PascalCase` export, kebab file | `stat-card.tsx` → `StatCard` |
| Hooks | `use-` prefix | `use-table-filters.ts` |
| Types/interfaces | `PascalCase`, no `I` prefix | `Deposit`, `CreateDepositInput` |
| Enums / constants | `SCREAMING_SNAKE` values | `DepositStatus.PENDING` |
| DB tables | `snake_case` plural via `@@map` | `profit_distributions` |
| DB columns | `snake_case` via `@map` | `created_at` |
| API routes | plural nouns, kebab | `/api/v1/daily-returns` |
| Env vars | `SCREAMING_SNAKE` | `JWT_ACCESS_SECRET` |
| Query keys | `<domain>Keys.<view>(args)` | `tradeKeys.list({ page })` |
| Branches | `type/short-description` | `feat/daily-return-engine` |
| Commits | Conventional Commits | `feat(wallet): add ledger reconciliation` |

---

## 7. Configuration and secrets

`config/env.ts` validates the entire environment with Zod **at boot** and exits non-zero on
failure. A missing `JWT_ACCESS_SECRET` must crash the process on startup, not surface as a 500 at
2am on the first login attempt.

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // ...
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && env.STORAGE_DRIVER === 'local') {
    // allowed, but warn loudly about backup implications
  }
})
```

Rules: no secret is ever committed; `.env.example` lists every key with a safe placeholder;
production secrets live in `/etc/meridian/.env` with `0600` permissions owned by the app user;
rotating a secret is a documented runbook, not an archaeology exercise.

---

## 8. Extension points designed in from day one

These are the seams that make the deferred features cheap later. Each is an interface with one
implementation today.

| Seam | Interface | v1 impl | Later |
|------|-----------|---------|-------|
| File storage | `StorageProvider` | `LocalStorage` | `S3Storage` — swap one env var |
| Notification delivery | `NotificationChannel` | in-app, email | Telegram, WhatsApp, push |
| Background work | `Queue` | in-process + outbox | BullMQ + Redis |
| Trade ingestion | `TradeSource` | `MANUAL` | `MT5_IMPORT`, `CSV_IMPORT`, broker API |
| Payments | `PaymentProvider` | manual review | gateway / crypto rails |
| Caching | `Cache` | in-memory | Redis |

**The storage seam in detail**, because it is called out in the brief:

```ts
interface StorageProvider {
  put(key: string, buf: Buffer, meta: { contentType: string }): Promise<StoredFile>
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

Files are addressed by **key** (`deposits/2026/08/<uuid>.webp`), never by filesystem path, and the
DB stores the key plus provider name. Migrating to S3 is then: implement `S3Storage`, run a
one-off copy script, flip `STORAGE_DRIVER=s3`. No schema change, no code change outside the
factory. Deposit proofs are **never** served from a public directory — access always goes through
an authorised endpoint that checks ownership or admin role and streams the file.

---

## 9. Testing strategy

| Level | Tool | What it covers | Bar |
|-------|------|----------------|-----|
| Unit | Vitest | `distribution.engine`, money utils, token service, date/trading-day logic | **100% on the engine.** Non-negotiable |
| Integration | Vitest + Supertest + test Postgres | Each module's routes against a real DB, in a transaction rolled back per test | All money-moving paths |
| Concurrency | Vitest | Two simultaneous "apply daily return" calls; double withdrawal against one balance | Must prove idempotency |
| E2E | Playwright | Register → verify → deposit → approve → apply return → withdraw | Happy path + 3 failure paths |
| Visual | Playwright screenshots | Landing page and dashboard at 3 breakpoints | No unintended layout drift |

The engine test suite includes the awkward cases explicitly: zero-balance wallets, a negative
return day, a user who deposited mid-day, a run applied twice, a run reversed and re-applied,
and rounding across 10,000 wallets summing correctly.

---

## 10. Observability

- **Correlation ID** generated per request, returned as `X-Request-Id`, attached to every log
  line and to any error shown to a user.
- **Structured logs** (Pino JSON) to `logs/`, rotated daily, kept 30 days.
- **Audit log** in Postgres for anything a human did that touched money or permissions.
- **Health endpoints**: `/health` (process alive) and `/health/ready` (DB reachable, migrations
  applied, storage writable) — the latter is what the deploy script polls before switching over.
- **Nightly reconciliation job** compares `SUM(ledger_entries.amount)` to `wallets.balance` per
  wallet and raises a `CRITICAL` alert on any drift. This is the canary for the entire money model.
