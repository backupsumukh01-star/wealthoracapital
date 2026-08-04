# Growzy API (`@meridian/api`)

Phase 1–5 backend: Express + TypeScript + PostgreSQL + Prisma + JWT auth, user/admin, RBAC, audit/activity, profiles, KYC, finance (wallet/ledger/deposits/withdrawals), and trading (trades/daily returns/performance).

Frontend UI is connected via `@meridian/shared` contracts and `apps/web` service clients.

## Stack

- Node.js 22+
- Express.js
- TypeScript (strict)
- PostgreSQL 16
- Prisma ORM
- JWT access tokens + opaque refresh tokens
- bcrypt password hashing
- Zod validation
- Helmet, CORS, cookie-parser, rate limiting
- Pino structured logging

## Quick start

```bash
# from repo root
cp apps/api/.env.example apps/api/.env

# start Postgres
cd apps/api && docker compose up -d

# install + generate Prisma client
pnpm install

# run first migration
pnpm --filter @meridian/api db:migrate

# develop
pnpm --filter @meridian/api dev
```

API listens on `http://localhost:4000`.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | tsx watch server |
| `pnpm build` | compile to `dist/` |
| `pnpm start` | run compiled server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Prisma client generate |
| `pnpm db:migrate` | create/apply migrations (dev) |
| `pnpm db:migrate:deploy` | apply migrations (prod) |

## Architecture

```
src/
  config/          env, cookies, constants
  database/        Prisma client singleton
  middlewares/     auth, RBAC, validation, errors, rate limit
  controllers/     HTTP adapters
  routes/          /api/health, /api/version, /api/v1/*
  services/        auth, profile, admin, kyc (+ risk/virus interfaces)
  repositories/    data access
  models/          DTO mappers
  validators/      Zod schemas
  storage/         local disk + signed URL abstraction
  emails/          transport + templates (provider deferred)
  jobs/            in-memory job queue interface
  utils/           logger, crypto, responses, errors
  types/           Express + auth types
```

## Auth model

| Cookie | Purpose |
|--------|---------|
| `mfx_at` | JWT access token (15m, httpOnly, SameSite=Lax) |
| `mfx_rt` | Opaque refresh token (7d, httpOnly, SameSite=Strict, path `/api/v1/auth`) |
| `mfx_csrf` | CSRF double-submit token |

Refresh tokens are stored hashed (SHA-256). Rotation revokes the previous token; reuse of a revoked token kills the whole session family.

## Roles (RBAC prepared)

| Product name | Storage |
|--------------|---------|
| Investor | `Role.USER` |
| Admin | `Role.ADMIN` (+ optional `StaffRole.ADMIN`) |
| Super Admin | `Role.SUPER_ADMIN` |
| Finance / Support / KYC / Content / Viewer | `StaffRole.*` |

Staff guards: `requireRoles`, `requireStaffRoles`.

## KYC (Phase 3)

Investor: `/api/v1/kyc/*` · Admin: `/api/v1/admin/kyc/*`  
Uploads use multipart + signed download URLs. See [KYC flow](../../docs/KYC_FLOW.md).

## Finance (Phase 4)

Investor: `/api/v1/wallet`, `/deposits`, `/withdrawals`, `/transactions`  
Admin: `/api/v1/admin/deposits|withdrawals|wallets|payment-methods|wallet-addresses|ledger|finance/metrics`  
See [Financial architecture](../../docs/FINANCIAL_ARCHITECTURE.md) and [Ledger](../../docs/LEDGER.md).

## Trading (Phase 5)

Investor: `/api/v1/trades`, `/performance/*`, `/portfolio`, `/returns`  
Admin: `/api/v1/admin/trades*`, `/admin/returns`, `/admin/performance`  
See [Trading architecture](../../docs/TRADING_ARCHITECTURE.md).

## Docs

- [Backend setup guide](../../docs/BACKEND_SETUP.md)
- [API Phase 5 Trading](../../docs/API_PHASE5_TRADING.md) · [Trading architecture](../../docs/TRADING_ARCHITECTURE.md) · [Performance](../../docs/PERFORMANCE_ENGINE.md) · [Distribution](../../docs/DISTRIBUTION_ENGINE.md)
- Earlier phases: [API Phase 1–4](../../docs/API_PHASE4_FINANCE.md), [Ledger](../../docs/LEDGER.md), [KYC](../../docs/KYC_FLOW.md)
- [Environment variables](../../docs/ENV_VARIABLES.md)
- [Phase 5 report](../../PHASE5_BACKEND_COMPLETION_REPORT.md)
