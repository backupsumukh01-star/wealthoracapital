# Growzy API (`@meridian/api`)

Phase 1–3 backend: Express + TypeScript + PostgreSQL + Prisma + JWT auth, user/admin management, RBAC, audit/activity, profiles, and the KYC engine.

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

## Docs

- [Backend setup guide](../../docs/BACKEND_SETUP.md)
- [API Phase 1](../../docs/API_PHASE1.md) · [API Phase 2](../../docs/API_PHASE2.md) · [API Phase 3 KYC](../../docs/API_PHASE3_KYC.md)
- [Database Phase 2](../../docs/DATABASE_PHASE2.md) · [Database Phase 3 KYC](../../docs/DATABASE_PHASE3_KYC.md)
- [Architecture Phase 2](../../docs/ARCHITECTURE_PHASE2.md) · [KYC flow](../../docs/KYC_FLOW.md)
- [Environment variables](../../docs/ENV_VARIABLES.md)
- [Phase 1](../../PHASE1_BACKEND_COMPLETION_REPORT.md) · [Phase 2](../../PHASE2_BACKEND_COMPLETION_REPORT.md) · [Phase 3](../../PHASE3_BACKEND_COMPLETION_REPORT.md)
