# Growzy API (`@meridian/api`)

Phase 1 backend foundation: Express + TypeScript + PostgreSQL + Prisma + JWT authentication.

Frontend UI is untouched. This package serves the contracts expected by `apps/web` auth clients.

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
  services/        auth, token, password
  repositories/    data access
  models/          DTO mappers
  validators/      Zod schemas
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

## Docs

- [Backend setup guide](../../docs/BACKEND_SETUP.md)
- [API documentation](../../docs/API_PHASE1.md)
- [Environment variables](../../docs/ENV_VARIABLES.md)
- [Phase 1 completion report](../../PHASE1_BACKEND_COMPLETION_REPORT.md)
