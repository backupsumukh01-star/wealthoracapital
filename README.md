# Meridian FX

Premium AI-assisted Forex investment platform.

> **Status:** Frontend scaffold complete. API is folder structure only. No business logic or live APIs yet.
> Planning docs live in [`docs/`](./docs/README.md).

## Stack

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 15 · App Router · TypeScript · Tailwind CSS v4 · Framer Motion · React Query · React Hook Form · shadcn/Radix · Lucide |
| Shared | `@meridian/shared` — types, enums, route constants |
| API | Express 5 (scaffold only — Phase 0+) |
| Design | Dark-first teal accent, glassmorphism, tabular figures — see `docs/10-design-system.md` |

## Packages

```
apps/web          Next.js investor + admin UI (placeholders)
apps/api          Express API folder tree (not implemented)
packages/shared   Shared types & constants
packages/config   Shared ESLint / TSConfig bases
docs/             Architecture & planning (source of truth)
infra/            Nginx / PM2 / deploy scripts (stubs)
```

## Quick start

```bash
# Node 22+, pnpm 9+
pnpm install
pnpm --filter @meridian/web dev
```

Open [http://localhost:3000](http://localhost:3000).

Route guards are **off** during scaffold so every placeholder page is browsable. Enable later with:

```env
NEXT_PUBLIC_ENABLE_ROUTE_GUARDS=true
```

## Scripts

| Command | What it does |
|---------|----------------|
| `pnpm dev` | Start all packages that define `dev` |
| `pnpm --filter @meridian/web dev` | Web only on :3000 |
| `pnpm build` | Build workspace |
| `pnpm lint` / `pnpm typecheck` | Quality gates |
| `pnpm format` | Prettier |

## Design system

Tokens: `apps/web/src/styles/tokens.css`  
Utilities: glass / glass-strong / glass-edge / surface-card / section-y / container-page  
Docs: [`docs/10-design-system.md`](./docs/10-design-system.md)

## Next phases

Follow [`docs/03-development-roadmap.md`](./docs/03-development-roadmap.md) — Phase 0 foundation → Phase 1 database → Phase 2 auth.
