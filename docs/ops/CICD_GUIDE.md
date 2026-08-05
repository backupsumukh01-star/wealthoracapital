# CI/CD Guide

## Workflows

| Workflow | File | Triggers |
|----------|------|----------|
| CI | `.github/workflows/ci.yml` | push/PR to `main` |
| Docker | `.github/workflows/docker.yml` | path filters + manual |
| Security | `.github/workflows/security.yml` | push/PR + weekly |

## CI jobs

1. **Lint & Typecheck** — monorepo ESLint + `tsc`
2. **Tests** — API Vitest + shared package tests against Postgres service
3. **Build** — API `tsup` + Next.js production build

Defaults keep `JOB_DRIVER=memory` and `CACHE_DRIVER=memory` so CI does not require Redis.

## Docker workflow

Builds (does not push by default):

- `apps/api/Dockerfile`
- `apps/api/Dockerfile.worker`
- `apps/web/Dockerfile`

Enable registry push by adding `docker/login-action` and `push: true` with your registry secrets.

## Deploy pattern (recommended)

1. CI green on `main`
2. Tag release `vX.Y.Z`
3. On the server: pull tag, backup, migrate, compose up
4. Smoke health endpoints

## Required secrets (optional)

- `SENTRY_AUTH_TOKEN` — if uploading source maps later
- Registry credentials for image push
- Deploy SSH / cloud credentials for CD (not wired by default — keep CD explicit)
