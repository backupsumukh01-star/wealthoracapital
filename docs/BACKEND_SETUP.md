# Backend Setup Guide (Phase 1)

## Prerequisites

- Node.js `>= 22`
- pnpm `>= 9`
- Docker (recommended) or a local PostgreSQL 16 instance
- Git

## 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

This generates the Prisma client via `apps/api` `postinstall`.

## 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Set strong values for:

- `JWT_ACCESS_SECRET` (≥ 32 chars)
- `JWT_REFRESH_SECRET` (≥ 32 chars, different)
- `DATABASE_URL`

See [ENV_VARIABLES.md](./ENV_VARIABLES.md).

## 3. Start PostgreSQL

Using the API compose file:

```bash
cd apps/api
docker compose up -d
```

Default connection:

```text
postgresql://meridian:meridian@localhost:5432/meridian?schema=public
```

## 4. Run migrations

```bash
pnpm --filter @meridian/api db:migrate
```

Name the first migration `phase1_auth` if prompted.

Production deploy:

```bash
pnpm --filter @meridian/api db:migrate:deploy
```

## 5. Start the API

```bash
pnpm --filter @meridian/api dev
```

Verify:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/version
```

## 6. Point the frontend at the API

In `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Do not change frontend UI code for Phase 1.

## 7. Production notes

- Set `NODE_ENV=production`
- Set `COOKIE_SECURE=true` behind HTTPS
- Set `COOKIE_DOMAIN` if web and API share a parent domain
- Rotate JWT secrets; never ship `.env.example` placeholders
- Use `EMAIL_TRANSPORT=smtp` only after a provider is integrated (Phase later)
- Prefer `pnpm --filter @meridian/api build && pnpm --filter @meridian/api start` or a process manager (PM2/systemd)
