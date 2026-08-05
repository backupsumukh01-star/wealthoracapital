# Growzy (Meridian FX monorepo)

Premium AI-assisted Forex investment platform.

> **Status:** Phases 1–6 backend live (auth, users/admin, KYC, wallet/ledger/finance, trading/daily returns/performance, CMS/media/reports/email engine/notifications/support/broadcasts/settings/ops metrics).

## Stack

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 15 · App Router · TypeScript · Tailwind CSS v4 · Framer Motion · React Query · React Hook Form · shadcn/Radix · Lucide |
| Shared | `@meridian/shared` — types, enums, route constants |
| API | Express + Prisma + PostgreSQL (`apps/api`) |
| Design | Dark-first teal accent, glassmorphism, tabular figures — see `docs/10-design-system.md` |

## Packages

```
apps/web          Next.js investor + admin UI
apps/api          Express API (Phases 1–3)
packages/shared   Shared types & constants
packages/config   Shared ESLint / TSConfig bases
docs/             Architecture, API, and KYC docs
infra/            Nginx / PM2 / deploy scripts (stubs)
```

## Quick start

```bash
# Node 22+, pnpm 9+
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @meridian/api db:migrate:deploy
pnpm --filter @meridian/api dev          # :4000
pnpm --filter @meridian/web dev          # :3000
```

Open [http://localhost:3000](http://localhost:3000). API: [http://localhost:4000](http://localhost:4000).

## Scripts

| Command | What it does |
|---------|----------------|
| `pnpm --filter @meridian/web dev` | Web on :3000 |
| `pnpm --filter @meridian/api dev` | API on :4000 |
| `pnpm build` | Build workspace |
| `pnpm lint` / `pnpm typecheck` | Quality gates |
| `pnpm format` | Prettier |

## Backend phases

- [Phase 1 — Auth](./PHASE1_BACKEND_COMPLETION_REPORT.md)
- [Phase 2 — Users / admin / RBAC](./PHASE2_BACKEND_COMPLETION_REPORT.md)
- [Phase 3 — KYC engine](./PHASE3_BACKEND_COMPLETION_REPORT.md)
- [Phase 4 — Financial engine](./PHASE4_BACKEND_COMPLETION_REPORT.md)
- [Phase 5 — Trading engine](./PHASE5_BACKEND_COMPLETION_REPORT.md)
- API: [`docs/API_PHASE5_TRADING.md`](./docs/API_PHASE5_TRADING.md) · Trading: [`docs/TRADING_ARCHITECTURE.md`](./docs/TRADING_ARCHITECTURE.md)
- [Phase 6 — Business operations (CMS, media, reports, email, notifications, support, broadcasts, settings)](./PHASE6_BACKEND_COMPLETION_REPORT.md)
- API: [`docs/API_PHASE6_CMS.md`](./docs/API_PHASE6_CMS.md) · [`docs/API_PHASE6_REPORTS.md`](./docs/API_PHASE6_REPORTS.md) · [`docs/API_PHASE6_EMAIL.md`](./docs/API_PHASE6_EMAIL.md) · [`docs/API_PHASE6_SUPPORT.md`](./docs/API_PHASE6_SUPPORT.md)

## OpenAPI

Complete Swagger/OpenAPI **3.1** for every backend endpoint:

- Live: [Swagger UI](http://localhost:4000/api/docs) · [Redoc](http://localhost:4000/api/redoc)
- Spec: [`docs/openapi/openapi.yaml`](./docs/openapi/openapi.yaml) · [`docs/openapi/openapi.json`](./docs/openapi/openapi.json)
- Collections: Postman + Insomnia under [`docs/openapi/collections/`](./docs/openapi/collections/)
- Changelog: [`docs/openapi/API_CHANGELOG.md`](./docs/openapi/API_CHANGELOG.md)
- Guide: [`docs/openapi/README.md`](./docs/openapi/README.md)
- Regenerate: `node scripts/generate-openapi.mjs`

## QA

- Report: [`QA_COMPLETION_REPORT.md`](./QA_COMPLETION_REPORT.md) · [`docs/qa/`](./docs/qa/)
- API tests: `pnpm --filter @meridian/api test` · coverage: `pnpm --filter @meridian/api test:coverage`
- E2E: `pnpm --filter @meridian/web test:e2e`
- Load: `k6 run tests/load/k6-smoke.js`
- Aggregate reports: `pnpm qa:report`

## Design system

Tokens: `apps/web/src/styles/tokens.css`  
Docs: [`docs/10-design-system.md`](./docs/10-design-system.md)

## Next (deferred)

Real Resend/SendGrid/SES/Mailgun credentials · push/SMS/WhatsApp/Telegram notification channels ·
Redis/BullMQ · WebSockets · CI/CD · perf testing
