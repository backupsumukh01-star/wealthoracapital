# Growzy (Meridian FX monorepo)

Premium AI-assisted Forex investment platform.

> **Status:** Phases 1–3 backend live (auth, users/admin/RBAC/audit, KYC). Frontend UI connected for those domains. Wallet/ledger/trading deferred.

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
- API: [`docs/API_PHASE3_KYC.md`](./docs/API_PHASE3_KYC.md) · Flow: [`docs/KYC_FLOW.md`](./docs/KYC_FLOW.md)

## Design system

Tokens: `apps/web/src/styles/tokens.css`  
Docs: [`docs/10-design-system.md`](./docs/10-design-system.md)

## Next (deferred)

Wallet · Ledger · Deposits/Withdrawals · Trading · Reports · CMS · Support channels
